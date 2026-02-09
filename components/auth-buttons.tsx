"use client";

import { Github, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { GlassPill } from "@/components/liquid-glass";
import { authClient } from "@/lib/auth-client";

function useIsLocalhost() {
  const [local, setLocal] = useState(false);
  useEffect(() => {
    setLocal(
      window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1",
    );
  }, []);
  return local;
}

export function GitHubButton() {
  return (
    <GlassPill
      as="button"
      variant="full"
      icon={Github}
      label="GitHub"
      onClick={() => authClient.signIn.social({ provider: "github" })}
    />
  );
}

export function TelegramButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await authClient.telegramLoginPopup();
    if (result) {
      window.location.reload();
    } else {
      setLoading(false);
    }
  }

  return (
    <GlassPill
      as="button"
      variant="full"
      icon={Send}
      label={loading ? "..." : "Telegram"}
      onClick={handleClick}
    />
  );
}

export function SignInButtons() {
  const isLocal = useIsLocalhost();

  if (isLocal) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Auth requires a public domain. Deploy to test sign-in.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <GitHubButton />
      <TelegramButton />
    </div>
  );
}

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => authClient.signOut().then(() => window.location.reload())}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Sign out
    </button>
  );
}
