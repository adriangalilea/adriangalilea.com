"use client";

// The hook over lib/audible: a component's claim on the page's one voice, released when
// it unmounts, and who holds the floor now.

import * as React from "react";
import {
  claim,
  holding,
  type Silence,
  subscribe,
  type VoiceKey,
} from "@/lib/audible";

/** This component's voice under `key`: `speak()` claims the floor (silencing whoever
 *  held it), `hush()` gives the claim back, and an unmount gives it back too. `silence`
 *  is what it does when another voice takes the floor; the latest one is called. */
export function useAudible(
  key: VoiceKey,
  silence: Silence,
): { speak: () => void; hush: () => void } {
  const latest = React.useRef(silence);
  React.useLayoutEffect(() => {
    latest.current = silence;
  });
  const releaseRef = React.useRef<(() => void) | null>(null);
  const hush = React.useCallback(() => {
    releaseRef.current?.();
    releaseRef.current = null;
  }, []);
  const speak = React.useCallback(() => {
    hush();
    releaseRef.current = claim(key, () => {
      releaseRef.current = null;
      latest.current();
    });
  }, [key, hush]);
  React.useEffect(() => hush, [hush]);
  return React.useMemo(() => ({ speak, hush }), [speak, hush]);
}

/** The voice holding the floor now, or null: re-renders when it changes. */
export function useHolding(): VoiceKey | null {
  return React.useSyncExternalStore(subscribe, holding, () => null);
}
