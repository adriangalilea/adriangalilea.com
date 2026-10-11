"use client";

import * as React from "react";
import type { Scheme } from "@/components/ui/material-glass";

// WHAT A CONTROL IS MADE OF: plain (the page's own surfaces, shadcn's look) or glass
// (liquid glass, the material in material-glass), and the colour SCHEME it stands in:
// the page's (`auto`), or its own whatever the page is (`dark`: glass over a picture;
// `light`: light glass over a picture on a dark page, its glass and words only).
// Every base control takes `material` and `scheme` and draws the face they name; its
// behaviour is written once and is the same in both. A page, a panel or a player sets
// them for everything inside it with <MaterialProvider>, the theme; a prop on one
// control overrides it there. Nothing set, a control is plain, in the page's scheme.
//
//   <MaterialProvider material="glass" scheme="dark">   a player's chrome
//     <Button>save</Button>               glass, dark: from the provider
//     <Button material="plain">…</Button>  plain, its own choice, still dark
//   </MaterialProvider>
//
// A provider that names only one of the two keeps the other from the one around it.

export type Material = "plain" | "glass";
export type { Scheme };

const MaterialContext = React.createContext<{
  material: Material;
  scheme: Scheme;
}>({ material: "plain", scheme: "auto" });

/** Sets the material and the scheme of every control inside it. Nested, the nearest
 *  one wins, for each of the two it names. */
export function MaterialProvider({
  material,
  scheme,
  children,
}: {
  material?: Material;
  scheme?: Scheme;
  children: React.ReactNode;
}) {
  const around = React.useContext(MaterialContext);
  const value = React.useMemo(
    () => ({
      material: material ?? around.material,
      scheme: scheme ?? around.scheme,
    }),
    [material, scheme, around.material, around.scheme],
  );
  return (
    <MaterialContext.Provider value={value}>
      {children}
    </MaterialContext.Provider>
  );
}

/** The material a control draws: its own `material` prop when given, else the
 *  nearest provider's, else plain. */
export function useMaterial(own?: Material): Material {
  const around = React.useContext(MaterialContext);
  return own ?? around.material;
}

/** The scheme a control stands in: its own `scheme` prop when given, else the
 *  nearest provider's, else the page's. */
export function useScheme(own?: Scheme): Scheme {
  const around = React.useContext(MaterialContext);
  return own ?? around.scheme;
}
