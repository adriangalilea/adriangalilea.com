---
title: "How I made DeepSeek 12x faster on a Mac Studio"
publishedAt: 2026-08-19
description: "21% of low-level kernel work, and a simple cache trick that 10x'd."
tags:
  - ai
  - programming
  - metal
  - local-llm
---

I have access to a Mac Studio M3 Ultra, 512GB of unified memory, running [antirez/ds4](https://github.com/antirez/ds4) ("DwarfStar"), a C + Metal inference engine, serving DeepSeek V4 Flash.

When I started measuring, a chat turn took between 6 and 20 seconds. A few hours of work later it takes **1.6s**.

## 1: the kernels

DeepSeek V4 uses sparse attention: a "lightning indexer" scores compressed KV and picks the top 512 rows per token. At long context that indexer dominates. Three PRs, each stacked on the last:

1. **[#830](https://github.com/antirez/ds4/pull/830)**: the scorer re-read ~1KB from device memory per scored pair. Half-pack Q/K once, read tiles from threadgroup memory.
2. **[#831](https://github.com/antirez/ds4/pull/831)**: register blocking. Two fresh threadgroup loads per 8x8 MMA becomes 1.5 with a doubled token tile, then **1.0** with K tiles resident in simdgroup registers. The reuse ladder maps monotonically onto throughput.
3. **[#832](https://github.com/antirez/ds4/pull/832)**: the top-k ran a padded bitonic sort plus a merge cascade, O(n log n) work while only 512 indices survive. Replaced with a single streaming pass: a running 512th-best threshold, atomic-free compaction via `simd_ballot`. Byte-identical output.

Cold prefill on the production box:

| context | before | after | Δ |
|---|---|---|---|
| 8k | ~571 t/s | 584 | +2.3% |
| 32k | ~490 | 530 | +8% |
| **64k** | **392** | **475** | **+21.2%** |

All of it bit-exact: every candidate ran behind a rollback env, ABBA'd against the incumbent, logits compared byte for byte at 32 context frontiers. One ULP different is a different model. All three PRs are in production and offered upstream.

## 2: the cache

A stateless chat client resends the conversation but never the exact reply the engine sampled, so it can't extend the live KV session and falls back to disk. And the disk cache's eviction policy scored the one checkpoint such a client can extend as the first victim: once the disk filled, every request prefilled from zero, ~20 seconds.

Three fixes:

- **Eviction** ([ds4#814](https://github.com/antirez/ds4/pull/814)): cold anchors outrank live dumps. A whole class of requests goes from 20s to 5-8s.
- **Replay the model's reply byte for byte.** The live session holds your prompt plus the exact reply it generated, and your next request reuses it only if it starts with exactly those tokens. So send the reply back verbatim: the exact text, or the tool call by id. Do that and `cached_tokens` ≈ everything, and a warm turn drops to **1.6s**.
- **Warm with `max_tokens: 0`.** To load a conversation into the cache before anyone asks anything, send it with `max_tokens: 0`: the engine processes the prompt and stops exactly at its end, so the next real request extends it. `max_tokens: 1` doesn't work: the single generated token becomes part of the session, your next request doesn't include it, and the cache misses.

Client-side recipe and measurements: [ds4#816](https://github.com/antirez/ds4/issues/816). This pass moved the user-facing latency more than anything else. **~12x on the worst case, ~4x on the typical warm turn.**

## What refused to move

Decode. **44 tokens/s, single stream, and it is a wall.** I priced it four independent ways: 45% of the weight-bandwidth floor while 98% GPU-busy, every matvec micro-lever falsified, a full-overlap probe capping dependency restructuring at +11%, and a final attempt, a second command queue overlapping the per-layer indexer chain with the big Q projection, that was **bit-exact on the first try and 31% slower**.

That failure taught me the two most useful things of the afternoon:

**Law 1.** A dependent, just-in-time cross-queue `MTLSharedEvent` round trip costs **~120-240µs of scheduling latency per hop**. 86 hops per token was the entire regression. Plain GPU-only `MTLEvent`s in the same topology cost nothing. Pre-satisfied waits never see this. Just-in-time waits pay it on every hop.

**Law 2.** With the hops fixed, the overlap still never materialized: the big Q projection dispatches ~16k threadgroups and **saturates the machine**. Concurrent work has no cores to run on during exactly the window worth hiding in. Occupancy, not ordering, is the gate.

I wrote the kills down as carefully as the wins. They cost more to learn.

## Against the cloud

The comparison that keeps me honest is DeepSeek's own first-party API, which is excellent and absurdly cheap:

|                           | DeepSeek official API | this box                      |
|---------------------------|-----------------------|-------------------------------|
| TTFT, 8k cold             | **0.91s**             | ~13s                          |
| decode                    | **72 t/s**            | 44                            |
| E2E, 8k in / 500 out      | **~7.9s**             | ~24s cold, 12-15s anchor-warm |
| warm chat turn            | ~1s                   | 1.6s                          |
| marginal cost, 8k summary | $0.003-0.007          | **~€0.0004**                  |

They win cold long-context, which is where the +21% landed. Warm turns are at parity. A warm turn here costs ~€0.00003 of electricity and it is fully private.
