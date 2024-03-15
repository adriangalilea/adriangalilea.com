---
title: "Private link aggregator"
publishedAt: 2024-03-15
description: "ADHD Adventures part 1"
slug: "e-ID-detour"
tags:
    - e-ID
    - wasm
    - side-quest
    - experiment
    - emoji-domain
    - ADHD
isPublish: true
---
It was a Friday afternoon after spending a week melting my brain reading Tip-Tap and ProseMirror docs non-stop to create the best self.fm editor. I was exhausted and my ADHD demon whispered...

> Can you create a link aggregator that stores no data?

Then I remembered about one of my beloved #side-quests [e-ID](/blog/e-ID)

So it began...

# Ideation
I jumped into ChatGPT, and asked about the feasibility of my  plan, store all the user links in the URL slug.

After consulting about various encoding and compression options I wrote `code` and pressed enter.

# Experimentation
![telegram-cloud-photo-size-4-5899819325966110101-y](https://github.com/adriangalilea/e-id/assets/90320947/a06d37a0-54b9-4aec-ae14-a096bcac31f9)
## Encoding
I tried all the encoding methods ChatGPT and I could think of, **base64-URL** produced the shortest URL-safe output.
## Compression
Brotli stood out as the most performant.
## Serializing the data into a standarised array format
At first I was storing the whole dictionary like:
`{'version':'1','name':'Adrian Galilea'...}`

But I realised that if I created a standarised format I could save quite a bunch of characters that I didn't have to encode in the slug.
```javascript
export const orderedKeys1: (keyof UserProfile1)[] = [
  "version", // just in case I change fields later
  "name",
  "bio",
  "personalSite",
  "email",
  "telegramHandle",
  "twitterHandle",
  "instagramHandle",
  "facebookHandle",
  "linkedInHandle",
  "other",
];
```
__this method saved ~50% of char length__

UX:
1. fill-out the form
2. |> serialize the data into a standarized array format ['name', 'website', 'twitter', '...']
3. |> compress it using brotli
4. |> base64-url encoding so it's url-safe

This is an example URL output:

[👤️️.to/G2wAYETdluo5XTCvqMWSB55zuCo65YC52oI6y40PRveUFZMlKA_tP1rR1w8emcxII4YJ5V3bBc-ZlpNx8NyN6NB8M7KQNaEo](https://e-id.to/ninja/G2wAYETdluo5XTCvqMWSB55zuCo65YC52oI6y40PRveUFZMlKA_tP1rR1w8emcxII4YJ5V3bBc-ZlpNx8NyN6NB8M7KQNaEo
)

All in all I'm happy with the result, but I'm sure this does not fit with the plans I have for the future of e-ID.
After all I want to provide readability [e-id.to/adrian](https://e-id.to/adrian)

So I archieved it under the /ninja/ path and preserved the code on the [open sourced repo](https://github.com/adriangalilea/e-id/ninja)

Thanks for reading!

Time to focus on self.fm