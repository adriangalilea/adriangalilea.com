---
title: "Why I Hate Apple (and Use It Anyway)"
publishedAt: 2024-04-17
description: "From arch btw to reluctant Apple user"
tags:
  - apple
  - linux
  - rant
isDraft: true
---

I dunked on Apple users every chance I had. Measured everything in specs per dollar. Apple users felt dumb to me.

I was the family computer guy. Tech support. Research what's the best Android for mom, spend hours on it, set it up, assist her monthly.

**arch was my daily btw.**

## What I Hate

iPad still has no calculator.

Window management is an absolute joke. macOS WM is atrocious. I miss native tiling. I need **paid apps** for basic functionality that Linux gives you for free.

Recording internal audio is impossible unless you pay. And even then they screw your volume control most of the time.

And then there's the filesystem.

```bash
cd ~/Library/Application Support/..  # FAILS - space breaks the command
cd "~/Library/Application Support/.." # FAILS - tilde doesn't expand in quotes
```

`Library` vs `library`. **Mixed case** breaks flow. **Spaces** in paths. Every script needs quotes. Every path needs escaping. Sometimes it's `~/Library/Preferences`, sometimes `~/Library/Application Support`, sometimes `/Library`, sometimes `/System/Library`. No principle. Just chaos.

Compare with XDG:

```bash
~/.config/      # Per-app configuration
~/.local/share/ # Application state/data
~/.cache/       # Temporary files
```

Simple. Lowercase. No spaces. Predictable. This is why I made [xdg-dirs](https://github.com/adriangalilea/xdg-dirs).

Apple's directory conventions are objectively worse for terminal users, shell scripting, and general programmatic use. You could argue that the casing is nice for Finder users. I claim most config is only accessed by programs or power users, and Finder users wouldn't care if things were lowercase kebab-case without spaces.

## The Pivot

Seven years ago I decided to test something. Instead of the regular "find what's the best Android for mom" ritual, I got her an iPhone.

She's using the same exact iPhone. Doesn't need or want anything else. My need to assist: **zero**. If she ever upgrades I won't need to teach her anything because it's the exact same thing.

Then I got a Mac for work.

## Linux vs macOS

As someone who distrohopped for way too many years: it is a time-sink and I don't recommend it for a work computer to my worst enemy.

Random bugs every time. Always feels like a skill issue. You end up scared of updating software. Choices are limited. Peripheral support is a lottery. Conditioned and restricted to little software, usually none polished enough.

Sure, when you make Linux work it is lovely. Sure, I hate needing paid apps in macOS for basic functionality.

But I'm **x100 more productive**. It is bliss.

Someone once told me "if you don't want to troubleshoot, stay away from arch." My answer: **once is too many.** Running into issues once is already too many when you're trying to get work done.

## The Realization

Despite how many things I hate about Apple, my life is way better. I was blind.

Now I measure things in **"it just works"** or **$/use**. Apple wins every time.

My time researching new purchases is mostly zero.

**Linux for servers. macOS for desktop.**
