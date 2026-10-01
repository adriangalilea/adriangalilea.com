---
title: "AI as an API"
publishedAt: 2026-10-01
description: "Typed answers with a confidence, not prose. It has a name now."
tags:
  - ai
---

July 2024, [on my Telegram channel](https://t.me/jardindigital/236):

<Telegram url="https://t.me/jardindigital/236" />

**Don't write the function. Describe it.** Let the model be the body, validate what comes back, refine for cost and quality.

The part that mattered was the last line of the output: `"confidence": 0.95`. An answer your code can act on, plus how much to trust it.

## 2025

In June I wrote it down properly: [Intention Is All You Need](/telos/intention-is-all-you-need). A function defined by its purpose, not its body.

```python
class SentimentResult(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"]
    confidence: float = Field(ge=0.0, le=1.0)

@telos
def analyze_sentiment(text: str) -> SentimentResult:
    """Analyze the sentiment of a text string."""
    pass

analyze_sentiment("This is amazing! I love it!")  # positive (0.98)
# day 1:  an LLM answers it,         847ms, $0.01 a call
# day 30: code it synthesized itself, 0.001ms
```

Typed in, typed out, and a **confidence** in what it returns. It works from the first call because an LLM answers it, and with use it writes the code that replaces the LLM.

<GitHub url="https://github.com/adriangalilea/telos" />

Three weeks later Vercel opened [an issue for an AI CLI](https://github.com/vercel/ai/issues/6976). Guillermo asked for files, model switching and pipes:

<GitHub url="https://github.com/vercel/ai/issues/6976#issuecomment-3026730420" />

I asked for one more thing: a schema, so the output is data you compose, not text you read. AI as an API blackbox, from the shell.

<GitHub url="https://github.com/vercel/ai/issues/6976#issuecomment-3029520382" lines={14} />

## 2026

Two weeks ago it got a name. **Decision models.**

TypeSafe shipped [Jev](https://simonwillison.net/2026/Sep/21/jev/), a model that doesn't write. State in, typed questions in, probabilities out. A yes/no with how likely it is. A choice with a distribution over the options. A score on a rubric. Nothing to parse, nothing to hallucinate.

Two days later Vercel's [ai-cli](https://github.com/vercel-labs/ai-cli) had it:

```bash
cat ticket.txt | ai decide \
  --boolean "refund=Refund requested?" \
  --choice "team=Which team?" \
  --choices "team=billing,support"
```

It shipped as `ai evaluate`. Two weeks later they [renamed it `ai decide`](https://github.com/vercel-labs/ai-cli/pull/103). The name caught up with what it does.

The first cut was even closer to the 2024 post: `git log | ai filter "describes a concurrency fix"`, `ai rank`, `ai pick`. Records in, records out, decided by meaning.

On Tuesday OpenAI announced a **Decisions API** at DevDay. Same shape: context in, predefined answers out, with a confidence.

## What I keep saying

The model is not the product. **The model is a function call.** The interesting part was never the prose, it was the typed answer and the number next to it, because that number is what lets code decide when to trust the answer and when to hand it to a person.

Two years from a Telegram post to a product category. The idea was the easy part. TypeSafe did the hard one: a model whose 0.95 actually means 95%.

## One layer

A decision model is one layer, not the whole thing.

<ContentQuote slug="feelings-are-cognition-metadata" />

That confidence is the model's feeling about its own answer. A gut call, and how sure the gut is. Sure enough, act. Not sure, think slower, or ask someone.

So I see the model as **composable**. A hybrid. Fast processes and slow ones, routed by that feeling.

Mixture of Experts already has the shape: a router picks which part of the model handles each token. The name says experts, as in what they know. I think the split that matters is by **how they think**. Deciding, reasoning, writing, remembering. Different processes, one model, the metadata doing the routing.

[Telos](/telos) already has the loop. A function starts slow, an LLM reasoning out every answer in 847ms, and use turns it into code that answers the same in 0.001ms. **System 2 becoming System 1**, the way a skill does in a person. A decision model is System 1 out of the box. Telos is how System 2 gets there.
