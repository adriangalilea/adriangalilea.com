/** A server env var, or a thrown error naming it. Client code cannot use this: Next
 *  inlines `NEXT_PUBLIC_*` only when the name is written out literally. */
export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}
