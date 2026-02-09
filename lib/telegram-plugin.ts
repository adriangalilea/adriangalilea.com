import { createHash, createHmac } from "node:crypto";
import type { BetterAuthPlugin, User } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";

type TelegramAuthData = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

function isValidShape(body: unknown): body is TelegramAuthData {
  const d = body as Record<string, unknown>;
  return (
    typeof d === "object" &&
    d !== null &&
    typeof d.id === "number" &&
    typeof d.first_name === "string" &&
    typeof d.auth_date === "number" &&
    typeof d.hash === "string"
  );
}

function verifyHmac(data: TelegramAuthData, botToken: string, maxAge: number) {
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > maxAge) return false;

  const { hash, ...rest } = data;
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
    .join("\n");

  const secret = createHash("sha256").update(botToken).digest();
  return (
    createHmac("sha256", secret).update(checkString).digest("hex") === hash
  );
}

export function telegram(opts: { botToken: string; maxAuthAge?: number }) {
  const { botToken, maxAuthAge = 86400 } = opts;

  return {
    id: "telegram",
    schema: {
      user: {
        fields: {
          telegramId: { type: "string", required: false, unique: false },
          telegramUsername: { type: "string", required: false, unique: false },
        },
      },
      account: {
        fields: {
          telegramId: { type: "string", required: false, unique: false },
          telegramUsername: { type: "string", required: false, unique: false },
        },
      },
    },
    endpoints: {
      signInWithTelegram: createAuthEndpoint(
        "/telegram/signin",
        { method: "POST" },
        async (ctx) => {
          const body = ctx.body;
          if (!isValidShape(body)) {
            return ctx.json(
              { error: "Invalid Telegram auth data" },
              { status: 400 },
            );
          }
          if (!verifyHmac(body, botToken, maxAuthAge)) {
            return ctx.json(
              { error: "Invalid Telegram authentication" },
              { status: 401 },
            );
          }

          const tgId = body.id.toString();
          const name = body.last_name
            ? `${body.first_name} ${body.last_name}`
            : body.first_name;

          const existingAccount = (await ctx.context.adapter.findOne({
            model: "account",
            where: [
              { field: "providerId", value: "telegram" },
              { field: "accountId", value: tgId },
            ],
          })) as { userId: string } | null;

          let userId: string;

          if (existingAccount) {
            userId = existingAccount.userId;
          } else {
            const now = new Date();
            const newUser = await ctx.context.adapter.create({
              model: "user",
              data: {
                name,
                image: body.photo_url,
                email: `tg_${tgId}@telegram.local`,
                emailVerified: false,
                telegramId: tgId,
                telegramUsername: body.username,
                createdAt: now,
                updatedAt: now,
              },
            });
            userId = newUser.id;
            await ctx.context.adapter.create({
              model: "account",
              data: {
                userId: newUser.id,
                providerId: "telegram",
                accountId: tgId,
                telegramId: tgId,
                telegramUsername: body.username,
                createdAt: now,
                updatedAt: now,
              },
            });
          }

          const session =
            await ctx.context.internalAdapter.createSession(userId);

          const user = (await ctx.context.adapter.findOne({
            model: "user",
            where: [{ field: "id", value: userId }],
          })) as User;

          await setSessionCookie(ctx, { session, user });
          return ctx.json({ user, session });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
