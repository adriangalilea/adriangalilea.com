---
title: "What is the best vibe coding language?"
publishedAt: 2026-02-09
description: "Python vs Rust vs Elixir. Token counts, iteration cost, and what actually matters."
tags:
  - ai
  - python
  - rust
  - elixir
  - vibe-coding
---

Context windows are finite. Tokens spent on boilerplate are tokens not spent reasoning. Inference speed is token-bound. API cost scales with tokens. **The more expensive a language is per feature, the less complexity you can fit in a conversation, and the slower and more expensive every iteration becomes.** This compounds.

I had a hypothesis: **Python is the cheapest language for LLM-assisted development.** Not because of preference. Because of token economics.

So I built the same software in **Python** and **Rust**. Same features, same API surface, same module structure. Then counted tokens.

## Part 1: Python vs Rust

| Benchmark |   Python |   Rust | Rust/Py |
|-----------|----------|--------|---------|
| todo_cli  |     1835 |   2395 | 1.3x    |
| rest_api  |     2333 |   3450 | 1.5x    |

Rust costs 30-50% more tokens for the same functionality. Type annotations, lifetime markers, trait implementations, explicit error handling. None of it is *wrong*. But every token is a token the LLM has to read, reason about, and generate.

**Python is cheaper. That means faster iteration, more room for complexity, lower cost.** Hypothesis confirmed.

## Part 2: Enter Elixir

Then someone sent me Dashbit's [Why Elixir Is the Best Language for AI](https://dashbit.co/blog/why-elixir-best-language-for-ai). They argue Elixir's concurrency model and fault tolerance make it ideal for AI workloads. Interesting claim. But how does it score on the token dimension?

I added Elixir to the benchmark.

| Benchmark |   Python |   Rust |   Elixir | Rust/Py | Elixir/Py |
|-----------|----------|--------|----------|---------|-----------|
| todo_cli  |     1835 |   2395 |     2229 | 1.3x    | 1.2x      |
| rest_api  |     2487 |   3669 |     2918 | 1.5x    | 1.2x      |

Elixir sits between Python and Rust. Closer to Python thanks to lightweight syntax and pattern matching. But module boilerplate and explicit piping add overhead.

Then I went further. Static token counts measure the final artifact. But vibe coding is a loop. Read, modify, verify, repeat. **What matters isn't the size of the destination. It's how far you travel to get there.**

I picked a real feature: *"When you delete a user, also delete all their posts. When listing users, include a post count."*

Crosses resource boundaries. Touches multiple layers. Forces schema evolution.

| Language | Before | After | Delta | Files touched |
|----------|--------|-------|-------|---------------|
| Python   |   2333 |  2487 |  +154 | 2             |
| Rust     |   3450 |  3669 |  +219 | 3             |
| Elixir   |   2725 |  2918 |  +193 | 2             |

**Python**: two files. Zero route changes. The store absorbed everything. Routes didn't even know the response shape changed.

**Elixir**: two files. `Map.put` on a plain map. Elegant. But the wiring is manual.

**Rust**: three files. The type system *forced* a new struct. Then every handler signature changed. The actual feature was a one-liner. The type plumbing was 80% of the work.

## The verdict

**Python wins.** Not just fewer tokens. Fewer files touched, fewer type ceremonies, and the ability to absorb cross-cutting changes locally.

Rust's distance is disproportionate. Every feature that crosses boundaries triggers the same ceremony: new type, new builder, new signatures. That compounds.

Elixir's concurrency story (the thing Dashbit argues for) didn't show up here at all. It lives in a different dimension than token cost.

Full source, methodology, and honest caveats about what this experiment does and doesn't prove: [vibe-coding-lang-bench](https://github.com/adriangalilea/vibe-coding-lang-bench).

> Part 2 and the iteration test were designed and executed by Claude Code (Opus 4.6).
