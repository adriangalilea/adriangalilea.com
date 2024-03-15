---
title: "e-ID detour"
publishedAt: 2024-03-15
description: "digital identity without data storage"
slug: "e-ID-detour"
tags:
    - e-ID
    - wasm
    - experiments
    - emoji-domains
isPublish: true
---
After learning a bunch of next.js and wanting to decompress from focusing on self.fm I decided to take a stab at my side-quest e-id.

It all started with a funny question.

# Can I create a link aggregator that stores no data?
> Ok... but how?
Using the best state manager, the URL :)

# Experimentation
![telegram-cloud-photo-size-4-5899819325966110101-y](https://github.com/adriangalilea/e-id/assets/90320947/a06d37a0-54b9-4aec-ae14-a096bcac31f9)
## Encoding
I tried all the encoding methods I could think of, **base64-URL** produced the shortest URL-safe output.
## Compression
Brotli stood out as the most performant.
## Serializing the data into a standarized array format
```javascript
export const orderedKeys1: (keyof UserProfile1)[] = [
  "version",
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

export const userProfileSchema1 = z.object({
  version: z.literal("1"),
  name: z.string(),
  bio: z
    .string()
    .max(280, { message: "Bio cannot exceed 280 characters" })
    .regex(/^[^;]*$/, { message: "Bio cannot contain semicolons (;)" })
    .optional(),
  personalSite: z.string().url().or(z.literal("")).optional(),
  email: z.string().email().or(z.literal("")).optional(),
  telegramHandle: z.string().optional(),
  twitterHandle: z.string().optional(),
  instagramHandle: z.string().optional(),
  facebookHandle: z.string().optional(),
  linkedInHandle: z.string().optional(),
  other: z.string().url().or(z.literal("")).optional(),
});
```

UX:
1. fill-out the form
2. |> serialize the data into a standarized array format ['name', 'website', 'twitter', '...']
3. |> compress it using brotli
4. |> base64-url encoding so it's url-safe

This is an example URL
https://e-id.to/ninja/G2wAYETdluo5XTCvqMWSB55zuCo65YC52oI6y40PRveUFZMlKA_tP1rR1w8emcxII4YJ5V3bBc-ZlpNx8NyN6NB8M7KQNaEo

# Update
I don't feel as this is a core necessity of any user, more of a personal curiosity detour, hence I deprecated it and archived it for posterity here 🧊