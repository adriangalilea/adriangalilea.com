---
title: "AI-targeted hacks"
publishedAt: 2026-01-25
updatedAt: 2026-03-28
tags:
  - predictions
  - ai
  - security
verdict: confirmed
deadline: "2026-12-31"
source: https://t.me/jardindigital/574
---

<Prediction>
First major wave of "hacks" targetting these users. Too much power over their lives, too little guardrails.
</Prediction>

## Log

### 2026-01-27 — OpenClaw goes viral, 512 vulnerabilities found

Peter Steinberger's weekend WhatsApp relay hit 20,000 GitHub stars in 24 hours and caused a Mac mini shortage. A security audit found **512 vulnerabilities, 8 critical**. The project gives an AI agent full access to file system, calendar, email, browser, and shell. A passwordless WebSocket on `0.0.0.0:18789`.

### 2026-01-27 to 2026-02-08 — 135,000+ exposed instances

SecurityScorecard found 135,000 unique IPs across 82 countries, **12,812 exploitable via RCE**. Nearly a thousand running without any authentication. Researchers demonstrated access to Anthropic API keys, Telegram bot tokens, Slack accounts, and complete chat histories.

### 2026-02-01 — Moltbook database catastrophe

Wiz found a misconfigured Supabase database. **1.5 million API tokens, 35,000 email addresses, private messages** — all exposed. API key hardcoded in client-side JS. Row Level Security never enabled. Fix: two SQL statements. Karpathy called it a "computer security nightmare."

### 2026-02-03 — CVE-2026-25253: one-click RCE (CVSS 8.8)

Attacker-controlled webpage exfiltrates authentication token via WebSocket in milliseconds. Full gateway compromise with one click.

### 2026-02-16 — ClawHavoc: 1,467 malicious skills

Koi Security audited all 2,857 skills on ClawHub. **1,467 malicious**, 335 from one coordinated campaign. Primary macOS payload: Atomic Stealer (AMOS) — harvests browser creds, keychain passwords, crypto wallets, SSH keys. One skill installed 340,000+ times before detection.

### 2026-03 — ClawJacked: full agent takeover via browser

Oasis Security: any website could hijack OpenClaw via localhost WebSocket. Guess the gateway password, connect with full permissions, interact with the user's AI agent. No visible indication to the user.

### 2026-03-24 — LiteLLM supply chain attack

TeamPCP compromised Trivy (a security scanner), stole LiteLLM's PyPI publish token, uploaded poisoned versions (1.82.7, 1.82.8) that steal SSH keys, AWS creds, K8s secrets, API keys, crypto wallets. The `.pth` file runs on every Python startup. No import needed. 95M monthly downloads. CVE-2026-33634, CVSS 9.4.

Discovered because the malicious code had a bug that caused a fork bomb.
