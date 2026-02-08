---
title: "DNS shouldn't break your flow"
publishedAt: 2026-02-03
description: "I built a Namecheap SDK so you can ship while vibe-coding."
tags:
  - python
  - domains
  - dns
  - open-source
  - vibe-coding
---
The vision is having a live website working at the end of your vibe-coding session. Domain registered, DNS configured. No context switches.

Manually adding A records and copy-pasting nameservers is the opposite of a flow state. That is if you already found the suitable domain and own it, otherwise friction compounds. By the time DNS propagates you've lost the plot.

I [collect domains](/blog/domain-collection). Every time I start a new project, the same friction. The existing Python libraries for the Namecheap API were either abandoned or returned raw XML dicts. So I built [namecheap-python](https://github.com/adriangalilea/namecheap-python) a proper SDK with a CLI, and a TUI to showcase what it can do.
## CLI
*Perfect for Claude Code*

```bash
# Is the domain available? How much?
namecheap-cli dns domain check mycoolproject.dev

# Register it (if you have the SDK wired up)
# Set up GitHub Pages DNS — five commands, done
namecheap-cli dns add mycoolproject.dev A @ 185.199.108.153
namecheap-cli dns add mycoolproject.dev A @ 185.199.109.153
namecheap-cli dns add mycoolproject.dev A @ 185.199.110.153
namecheap-cli dns add mycoolproject.dev A @ 185.199.111.153
namecheap-cli dns add mycoolproject.dev CNAME www myuser.github.io

# Or Vercel
namecheap-cli dns set-nameservers mycoolproject.dev ns1.vercel-dns.com ns2.vercel-dns.com

# Enable privacy
namecheap-cli privacy enable mycoolproject.dev me@gmail.com
```

No browser. No dashboard. No context switch. Preserve the flow.

This is how the SDK DX looks like:

```python
from namecheap import Namecheap

nc = Namecheap()

nc.dns.set("mycoolproject.dev",
    nc.dns.builder()
    .a("@", "185.199.108.153")
    .a("@", "185.199.109.153")
    .a("@", "185.199.110.153")
    .a("@", "185.199.111.153")
    .cname("www", "myuser.github.io")
    .txt("@", "v=spf1 include:_spf.google.com ~all")
)

nc.whoisguard.enable("mycoolproject.dev", "me@gmail.com")
```

Everything returns Pydantic models. No dicts, no raw XML.

## What it covers

Three core API namespaces, fully:

- **`namecheap.domains.*`** — check, list, register, renew, lock/unlock, contacts, TLD list
- **`namecheap.domains.dns.*`** — DNS builder, email forwarding, nameserver switching, export
- **`namecheap.whoisguard.*`** — enable, disable, renew, rotate email, list subscriptions

Plus account balance and pricing:

```
$ namecheap-cli account pricing com
         Domain Pricing — REGISTER
┏━━━━━━┳━━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━┳━━━━━━━━━━━━┓
┃ TLD  ┃ Duration ┃   Price ┃ Regular ┃ Your Price ┃
┡━━━━━━╇━━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━╇━━━━━━━━━━━━┩
│ .com │  1 year  │  $11.28 │  $14.98 │     $11.28 │
│ .com │ 2 years  │  $26.26 │  $14.98 │     $26.26 │
│ .com │ 3 years  │  $41.24 │  $14.98 │     $41.24 │
└──────┴──────────┴─────────┴─────────┴────────────┘
```

## Undocumented Namecheap API quirks

Building this surfaced things Namecheap doesn't document:

**TTL "Automatic" = 1799 seconds.** The web UI shows "Automatic" when TTL is exactly 1799, and "30 min" for 1800. Their docs say the default is 1800. The SDK defaults to 1799 to match what users actually see.

**No WHOIS lookups.** The API only operates on domains in your account. You can't look up arbitrary domains or query the Namecheap Marketplace. `domains.check()` tells you if a domain is unregistered, not if it's for sale by its owner.

**`domainprivacy.*` is actually `whoisguard.*`.** The sidebar says `domainprivacy` but the commands are `namecheap.whoisguard.*`. They operate on WhoisGuard subscription IDs, not domain names. The SDK resolves this automatically — you pass a domain name, it finds the ID via a `getList` call.

## Design

**`assert` for assumptions, not defensive programming.** If the API returns something unexpected, the SDK screams instead of silently returning garbage.

**DNS builder pattern.** Namecheap's `setHosts` is all-or-nothing — it replaces every record. The builder makes it hard to accidentally nuke your DNS.

**Pydantic for everything.** The Namecheap API returns XML with inconsistent casing, boolean strings, and nested attributes. Pydantic validators absorb the mess at the boundary so consumers get clean typed data.

## What's next: Claude Code integration

Claude Code already runs `namecheap-cli` commands perfectly — it's been doing it throughout the development of this very library. "Set up GitHub Pages DNS for tdo.garden" and it runs the five `dns add` commands itself. It works today.

But it's slow the first time. Claude has to discover the CLI surface — run `--help`, read the output, figure out the right subcommands and flags. A [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) fixes this through progressive disclosure: the skill pre-loads what commands exist, which are destructive, and what the common workflows look like (GitHub Pages, Vercel, Cloudflare). Claude skips the discovery phase and goes straight to execution.

Same capability, much faster. That's the next step.

## Install

```bash
# SDK only
uv add namecheap-python

# CLI
uv tool install --python 3.12 'namecheap-python[cli]'

# Everything (CLI + TUI)
uv tool install --python 3.12 'namecheap-python[all]'
```

Contributors: [@huntertur](https://github.com/huntertur), [@jeffmcadams](https://github.com/jeffmcadams), [@cosmin](https://github.com/cosmin).

---

[GitHub](https://github.com/adriangalilea/namecheap-python) | [PyPI](https://pypi.org/project/namecheap-python/)
