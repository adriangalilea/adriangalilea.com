---
title: "Claude Code's deny rules won't save you."
publishedAt: 2026-02-12
description: "How to auto-approve git commands without losing control."
tags:
  - ai
  - claude-code
  - go
  - security
  - vibe-coding
---

I want Claude to run `git commit`, `git status`, `git diff`, `git add <file>` without asking me every time. Zero friction:

```
⏺ Bash(git add src/main.go lib/utils.go)
  ⎿  (auto-approved)

⏺ Bash(git -C /projects/app commit -m "feat: add user auth")
  ⎿  (auto-approved)
```

But I also want `git push --force` and `git add -A` Blocked. I'll do those manually if I want to, thanks. `git reset --hard`? Asks me first.
## Why this isn't straightforward

Claude Code's [permission system](https://code.claude.com/docs/en/permissions) uses prefix matching. I tried to configure it with allow rules alone:

- `Bash(git commit:*)` — works, but misses `git -C /path commit`
- `Bash(git -C:*)` — fixes that, but now auto-approves everything starting with `git -C`, including what you'd want to block
- `Bash(git * reset --hard)` — the documented wildcard syntax that should handle mid-pattern matching. [Doesn't work in `settings.json`](https://github.com/anthropics/claude-code/issues/24815).

The core issue: `Bash(git reset --hard:*)` matches `git reset --hard` but not `git -C /path reset --hard`. Claude inserts `-C` when working across directories. Your deny pattern silently stops matching. **The pattern system cannot express "block this subcommand regardless of flags."**

[Known issue](https://github.com/anthropics/claude-code/issues/13371). No fix shipped yet.

## The fix

Claude Code has [hooks](https://code.claude.com/docs/en/hooks): shell commands that fire before/after tool calls. A `PreToolUse` hook receives the command as JSON on stdin and can return `permissionDecision: "deny"` or `"ask"`.

The hook fires on **every** Bash call, not just git. Hundreds of times per session. So I wrote it in Go: static binary, `<1ms` cold start, no runtime.

It truncates at shell operators (Claude appends `2>&1; echo "EXIT: $?"` to commands), strips git global flags like `-C`, `--git-dir`, `--work-tree`, and checks what's left against a rule table:

| Command | Action | Reason |
|---|---|---|
| `git add -A / --all` | **deny** | No safe use case for an AI agent, just be explicit |
| `git push --force / -f` | **deny** | Rewrites remote history |
| `git push` | **ask** | Not destructive, but should confirm |
| `git reset --hard` | **ask** | Destructive when unsolicited, legitimate when requested |
| `git clean -f` | **ask** | Same |
| `git checkout .` | **ask** | Same |
| `git branch -D` | **ask** | Same |

The hook **never returns `permissionDecision: "allow"`**. It only denies or asks. Everything else exits silently, letting the normal permission system handle it. Denied commands tell Claude to `pbcopy` the command for me to run manually.

So now it finally

```
⏺ Bash(git -C /tmp/test-guard status)
  ⎿  On branch main
     nothing to commit, working tree clean

⏺ Bash(git -C /tmp/test-guard push --force)
  ⎿  PreToolUse:Bash hook returned blocking error
  ⎿  Error: git push --force is blocked.

⏺ Bash(git -C /tmp/test-guard add -A)
  ⎿  PreToolUse:Bash hook returned blocking error
  ⎿  Error: git add -A/--all is blocked. Stage specific files instead.

⏺ Bash(git -C /tmp/test-guard reset --hard)
  ⎿  Hook PreToolUse:Bash requires confirmation for this command:
     git reset --hard — destroys uncommitted work
  ⎿  Do you want to proceed?
     ❯ 1. Yes
       2. No
```

## The setup

Three layers working together:

**1. `settings.json` allow rules** auto-approve common git commands globally:

```json
"allow": [
  "Bash(git add:*)",
  "Bash(git status:*)",
  "Bash(git commit:*)",
  "Bash(git diff:*)",
  "Bash(git branch:*)",
  "Bash(git log:*)",
  "Bash(git -C:*)"
]
```

**2. `git-guard` PreToolUse hook** (Go binary at `~/.claude/hooks/git-guard`) fires on every Bash call. Normalizes the command by stripping `-C` and shell operators, then checks the subcommand against the rule table above. Never returns "allow", so it can't bypass the permission system.

```json
"hooks": {
  "PreToolUse": [{
    "matcher": "Bash",
    "hooks": [{
      "type": "command",
      "command": "~/.claude/hooks/git-guard"
    }]
  }]
}
```

**3. Claude Code's built-in permission system** handles everything else.

The allow rules give you friction-free git. The hook catches what the deny rules can't. The built-in system covers the rest.

## The code

```go
package main

import (
	"encoding/json"
	"os"
	"strings"
)

type HookInput struct {
	ToolInput struct {
		Command string `json:"command"`
	} `json:"tool_input"`
}

type HookOutput struct {
	HookSpecificOutput struct {
		HookEventName            string `json:"hookEventName"`
		PermissionDecision       string `json:"permissionDecision"`
		PermissionDecisionReason string `json:"permissionDecisionReason"`
	} `json:"hookSpecificOutput"`
}

func decision(action, reason string) {
	out := HookOutput{}
	out.HookSpecificOutput.HookEventName = "PreToolUse"
	out.HookSpecificOutput.PermissionDecision = action
	out.HookSpecificOutput.PermissionDecisionReason = reason
	json.NewEncoder(os.Stdout).Encode(out)
	os.Exit(0)
}

func deny(reason string) { decision("deny", reason) }
func ask(reason string)  { decision("ask", reason) }

func stripGitFlags(tokens []string) []string {
	var result []string
	skip := false
	for _, t := range tokens {
		if skip {
			skip = false
			continue
		}
		if t == "-C" || t == "--git-dir" || t == "--work-tree" {
			skip = true
			continue
		}
		if strings.HasPrefix(t, "--git-dir=") || strings.HasPrefix(t, "--work-tree=") {
			continue
		}
		if strings.HasPrefix(t, "-C") && len(t) > 2 {
			continue
		}
		result = append(result, t)
	}
	return result
}

func truncateAtShellOp(tokens []string) []string {
	for i, t := range tokens {
		if t == "&&" || t == "||" || t == "|" || t == ";" {
			return tokens[:i]
		}
		if strings.Contains(t, ";") {
			return tokens[:i]
		}
	}
	return tokens
}

func hasToken(tokens []string, target string) bool {
	for _, t := range tokens {
		if t == target {
			return true
		}
	}
	return false
}

func hasForceFlag(tokens []string) bool {
	for _, t := range tokens {
		if t == "--force" || t == "-f" {
			return true
		}
		if strings.HasPrefix(t, "-") && !strings.HasPrefix(t, "--") &&
			strings.Contains(t, "f") {
			return true
		}
	}
	return false
}

func main() {
	var input HookInput
	if err := json.NewDecoder(os.Stdin).Decode(&input); err != nil {
		os.Exit(0)
	}

	cmd := strings.TrimSpace(input.ToolInput.Command)
	if cmd == "" || !strings.HasPrefix(cmd, "git ") && cmd != "git" {
		os.Exit(0)
	}

	tokens := strings.Fields(cmd)[1:]
	tokens = truncateAtShellOp(tokens)
	tokens = stripGitFlags(tokens)

	if len(tokens) == 0 {
		os.Exit(0)
	}

	sub := tokens[0]
	args := tokens[1:]

	switch sub {
	case "add":
		if hasToken(args, "-A") || hasToken(args, "--all") {
			deny("git add -A/--all is blocked. Stage specific files instead.")
		}
	case "push":
		if hasForceFlag(args) || hasToken(args, "--force-with-lease") {
			deny("git push --force is blocked.")
		}
		ask("git push — confirm with the user before pushing")
	case "reset":
		if hasToken(args, "--hard") {
			ask("git reset --hard — destroys uncommitted work")
		}
	case "clean":
		for _, a := range args {
			if strings.HasPrefix(a, "-") && strings.Contains(a, "f") {
				ask("git clean -f — deletes untracked files")
			}
		}
	case "checkout":
		if len(args) >= 1 && args[0] == "." {
			ask("git checkout . — discards all unstaged changes")
		}
	case "branch":
		if hasToken(args, "-D") {
			ask("git branch -D — force-deletes branch")
		}
	}

	os.Exit(0)
}
```

## What I'll likely change

I put the git allow rules in `settings.json` because I want them globally. But I think I will put them in my `/commit` slash command frontmatter instead:

```yaml
---
description: Create a git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git -C:*)
---
```

One ghostty split with lazygit, one with Claude Code. Pick which files to stage in lazygit, `/commit` in Claude. More controlled and just as smooth.
