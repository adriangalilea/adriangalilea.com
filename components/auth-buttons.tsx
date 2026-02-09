"use client";

import { Github } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    <button
      type="button"
      onClick={() => authClient.signIn.social({ provider: "github" })}
      className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-80"
    >
      <Github size={16} />
      GitHub
    </button>
  );
}

export function TelegramButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !containerRef.current) return;
    initialized.current = true;
    const containerId = `tg-login-${Math.random().toString(36).slice(2, 8)}`;
    containerRef.current.id = containerId;

    authClient.initTelegramWidget(
      containerId,
      { size: "large", cornerRadius: 8 },
      async (authData) => {
        await authClient.signInWithTelegram(authData);
        window.location.reload();
      },
    );
  }, []);

  return <div ref={containerRef} />;
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
