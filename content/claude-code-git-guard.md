---
title: "Building a git guard for Claude Code in Go"
publishedAt: 2026-02-12
description: "Claude Code's permission system is fragile. A 160-line Go hook that actually parses git commands."
tags:
  - ai
  - claude-code
  - go
  - security
  - vibe-coding
---

## What it looks like

I type `/commit`. Claude reads the staged diff, writes a commit message, runs `git commit`. No permission prompts. No interruptions.

If Claude tries `git reset --hard`, it has to ask me first:

```
⏺ Bash(git reset --hard)
  ⎿ Do you want to proceed?
  ⎿ git reset --hard — destroys uncommitted work
  ⎿ 1. Yes  2. Yes, and don't ask again  3. No
```

If Claude tries `git push --force`, it gets blocked entirely:

```
⏺ Bash(git -C /projects/my-app push --force)
  ⎿ PreToolUse:Bash hook returned blocking error
  ⎿ Error: git push --force is blocked.
```

Claude then `pbcopy`s the command so I can run it myself if I really want to.

Safe git commands flow without friction. Dangerous ones are either blocked or require my explicit approval. This works regardless of whether Claude uses `git commit` or `git -C /some/path commit`. Getting here was harder than it should have been.

## The problem

Claude Code has a permission system. You write patterns like `Bash(git commit:*)` in `settings.json` and it auto-approves matching commands. You write deny patterns and it blocks them.

The patterns are string prefix matches. That breaks in two ways:

**Allow patterns are too narrow.** `Bash(git commit:*)` doesn't match `git -C /path commit` because the command starts with `git -C`, not `git commit`. The `-C` flag just changes git's working directory. Same operation, different prefix, permission prompt every time.

**Deny patterns are too narrow.** `Bash(git reset --hard:*)` blocks `git reset --hard` but not `git -C /path reset --hard`. Same destructive command, sails through the deny rule.

I have a `/commit` slash command. It should run `git add`, `git status`, `git commit`, `git diff`, `git log`, `git branch` without prompting. It should **never** run `git add -A` (stages everything, including secrets and binaries). It should **ask** before `git push`, `git reset --hard`, and other destructive commands. And this should work no matter what flags git gets.

## Attempt 1: Slash command frontmatter

The first attempt was straightforward. In `.claude/commands/commit.md`:

```yaml
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*)
denied-tools: Bash(git add -A:*), Bash(git add -A)
```

This works for plain `git commit -m "message"`. But `git -C /path commit -m "message"` prompts for permission every time. The pattern only does prefix matching.

## Attempt 2: Add -C patterns

```yaml
allowed-tools: ..., Bash(git -C * commit:*)
```

Doesn't work. The `*` wildcard in the middle of a pattern isn't supported in the `:*` (legacy) syntax. The command still prompts.

## Attempt 3: Broad -C allow

```yaml
allowed-tools: ..., Bash(git -C:*)
```

This works for allowing. But now `git -C /path add -A` sails through because the deny pattern `Bash(git add -A:*)` only matches commands starting with `git add`, not `git -C`.

**Deny is evaluated before allow**, but the deny pattern simply doesn't match.

## Attempt 4: Read the docs more carefully

The [official docs](https://code.claude.com/docs/en/permissions) say:

> Wildcards can appear at any position in the command, including at the beginning, middle, or end.

With an example: `Bash(git * main)` matches `git checkout main`, `git merge main`.

So `Bash(git * add -A)` should deny `git -C /path add -A`. The docs also say the space-star (` *`) syntax is current and colon-star (`:*`) is deprecated.

But [issue #24815](https://github.com/anthropics/claude-code/issues/24815) reports that ` *` syntax doesn't work in `settings.json`, only `:*` does. And `:*` doesn't support mid-pattern wildcards.

I tested it. The deny pattern `Bash(git * add -A:*)` in `settings.json` does nothing. `git -C /tmp/test add -A` runs without complaint.

**The pattern system cannot express this constraint.**

Related issues:
- [#24815](https://github.com/anthropics/claude-code/issues/24815): `settings.json` only recognizes legacy `:*` suffix
- [#21642](https://github.com/anthropics/claude-code/issues/21642): Official commit plugin's `allowed-tools` missing required git commands
- [#14956](https://github.com/anthropics/claude-code/issues/14956): Skill `allowed-tools` doesn't grant Bash permission at all

## Attempt 5: Bash PreToolUse hook

Claude Code has [hooks](https://code.claude.com/docs/en/hooks): shell commands that run before/after tool calls. A `PreToolUse` hook receives the command as JSON on stdin and can return `permissionDecision: "deny"` or `"ask"` to block or prompt.

First version was a bash script. It used `sed` to strip `-C /path` from the command, then `grep` to check for dangerous subcommands.

It didn't work on macOS. BSD `sed` doesn't support `\s`. The script silently failed to normalize the command, so `-C` variants passed through undetected.

Fixing it with `[[:space:]]` would work. But at this point I had:
- A regex-based parser for shell commands
- Written in bash
- Running on every single Bash tool call
- Dealing with BSD vs GNU compatibility
- About to get more complex with deny/ask split

## The solution: Go

160 lines. Compiles to a static binary. Starts in under 1ms. No runtime dependencies. No BSD/GNU issues.

The hook does three things:

**1. Truncate at shell operators.** Claude wraps commands with `2>&1; echo "EXIT: $?"`. Without truncation, `git checkout .` has extra tokens after `.` and the check fails. Truncating at `;`, `&&`, `||`, `|` isolates the git command.

**2. Strip git global flags.** `-C <path>`, `--git-dir=<path>`, `--work-tree=<path>` are removed. What's left is the actual subcommand and its arguments.

**3. Check against rules.**

| Command | Action | Reason |
|---|---|---|
| `git add -A / --all` | **deny** | No safe use case for an AI agent |
| `git push --force / -f` | **deny** | Rewrites remote history |
| `git push` | **ask** | Not destructive, but should confirm |
| `git reset --hard` | **ask** | Destructive when unsolicited, legitimate when requested |
| `git clean -f` | **ask** | Same |
| `git checkout .` | **ask** | Same |
| `git branch -D` | **ask** | Same |

Denied commands tell Claude to `pbcopy` the command for the user to run manually. Ask commands show a prompt where I choose yes or no.

The hook **never returns `permissionDecision: "allow"`**. It only denies or asks. Everything else exits silently, letting the normal permission system handle it. This means it can't accidentally bypass protections. Claude Code's built-in shell operator awareness still catches chained commands like `git status && rm -rf /`.

The full source:

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

## Why Go

The hook fires on **every Bash tool call**. Not just git commands. Every `ls`, every `npm install`, every `python script.py`. It reads stdin, checks if it starts with `git`, and exits.

- **Go binary**: `<1ms` cold start. JSON decode, string split, switch statement, exit.
- **Python**: ~30ms cold start. Fine for most things. Noticeable when it runs hundreds of times per session.
- **Elixir**: ~300ms cold start (BEAM VM). Beautiful pattern matching. Unusable latency for a hot-path hook.
- **Bash**: Zero startup cost but macOS BSD `sed`/`grep` compatibility is a minefield. The first version failed silently because `\s` isn't supported in BSD sed.

Go compiles once, runs everywhere, no runtime, no compatibility issues. For a hot-path hook that does string parsing, it's the obvious choice.

## The full setup

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

## A note on where allow rules live

I put the git allow rules in `settings.json` because I want them globally. But if you want tighter control, put them in your slash command's frontmatter instead:

```yaml
---
description: Create a git commit
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git -C:*)
---
```

This scopes the auto-approval to only when that command is active. Every other context would still prompt for git commands. For most people this is probably the better default. I chose global because I work across multiple repos and don't want prompts during normal git workflows outside of `/commit`.

## Why this was necessary

The pattern matching system has real gaps that made this hook necessary:

- `:*` (legacy, works in settings.json) only does prefix matching
- ` *` (current, documented) doesn't work in settings.json ([#24815](https://github.com/anthropics/claude-code/issues/24815))
- Mid-pattern wildcards like `Bash(git * add -A)` don't work in practice despite being documented
- Skill-scoped `allowed-tools` don't grant Bash permissions ([#14956](https://github.com/anthropics/claude-code/issues/14956))

The hook fixes all of these. It doesn't care about pattern syntax because it parses the actual command string. `-C`, `--git-dir`, compound flags, shell operators, all handled. The trade-off is you're writing and maintaining a compiled program instead of a one-liner in a JSON config. For git safety, that trade-off is worth it.
