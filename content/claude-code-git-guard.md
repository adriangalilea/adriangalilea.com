---
title: "Claude Code's deny rules won't save you."
publishedAt: 2026-02-12
description: "Here's the hook that fixes that."
tags:
  - ai
  - claude-code
  - go
  - security
  - vibe-coding
---

Claude Code's [permission docs](https://code.claude.com/docs/en/permissions) say you can deny dangerous commands with wildcard patterns. `Bash(git * reset --hard)` should block `git -C /path reset --hard`. It doesn't. The ` *` syntax [doesn't work in `settings.json`](https://github.com/anthropics/claude-code/issues/24815).

I tried:
- `Bash(git commit:*)` — prefix only, misses `git -C /path commit`
- `Bash(git -C:*)` — allows everything through, including what deny rules should block
- `Bash(git * add -A)` — documented syntax, [doesn't work](https://github.com/anthropics/claude-code/issues/24815)

The core issue is prefix matching. `Bash(git reset --hard:*)` matches `git reset --hard` but not `git -C /path reset --hard`. You can broaden with `Bash(git -C:*)` but then your deny rules stop matching too. The ` *` syntax that would allow mid-pattern wildcards [doesn't work in `settings.json`](https://github.com/anthropics/claude-code/issues/24815). **The pattern system cannot express "deny this subcommand regardless of flags."**

## The parsing hook

Claude Code has [hooks](https://code.claude.com/docs/en/hooks): shell commands that fire before/after tool calls. A `PreToolUse` hook receives the command as JSON on stdin and can return `permissionDecision: "deny"` or `"ask"`.

The hook would fire on **every** Bash tool call, not just git. That is hundreds of times per session. You don't want to parse commands in bash. So I chose Go: static binary, `<1ms` cold start, no runtime.

The idea is to truncate at shell operators (Claude appends `2>&1; echo "EXIT: $?"` to commands), strips git global flags like `-C`, `--git-dir`, `--work-tree`, and checks what's left against a rule table:

| Command | Action | Reason |
|---|---|---|
| `git add -A / --all` | **deny** | No safe use case for an AI agent, just be explicit |
| `git push --force / -f` | **deny** | Rewrites remote history |
| `git push` | **ask** | Not destructive, but should confirm |
| `git reset --hard` | **ask** | Destructive when unsolicited, legitimate when requested |
| `git clean -f` | **ask** | Same |
| `git checkout .` | **ask** | Same |
| `git branch -D` | **ask** | Same |

The hook **never returns `permissionDecision: "allow"`**. It only denies or asks. Everything else exits silently, letting the normal permission system handle it.

In practice it looks like this:

```
⏺ Bash(git reset --hard)
  ⎿ Do you want to proceed?
  ⎿ git reset --hard — destroys uncommitted work
  ⎿ 1. Yes  2. Yes, and don't ask again  3. No
```

```
⏺ Bash(git -C /projects/my-app push --force)
  ⎿ PreToolUse:Bash hook returned blocking error
  ⎿ Error: git push --force is blocked.
```

Denied commands tell Claude to `pbcopy` the command for me to run manually.

## The code:

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

## The setup

Three layers:

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

**2. `git-guard` PreToolUse hook** (Go binary at `~/.claude/hooks/git-guard`) fires on every Bash call. Normalizes the command by stripping `-C` and shell operators. Denies `add -A` and `push --force`. Asks for `push`, `reset --hard`, `clean -f`, `checkout .`, `branch -D`. Never returns "allow", so it can't bypass the permission system.

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

**3. Claude Code's built-in permission system** handles everything else. Shell operator awareness prevents chained command attacks. The hook is deny-only, so normal permission evaluation always runs.

## What I'll likely change

I put the git allow rules in `settings.json` because I want them globally. But I think I will put them in my `/commit` slash command frontmatter instead:

```yaml
---
description: Create a git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git -C:*)
---
```

It blends well with my setup, one ghostty split with lazygit and another one with claude code, so I just pick which files to stage and `/commit` it is more controlled and just as smooth.

This is a [known issue](https://github.com/anthropics/claude-code/issues/13371). Deny rules are bypassable via flag reordering and nobody has shipped a fix yet. [This hook is my workaround](https://github.com/anthropics/claude-code/issues/13371#issuecomment-3891292002).
