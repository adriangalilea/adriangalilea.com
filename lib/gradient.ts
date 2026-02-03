// Deterministic mesh gradient — analogous hues within a 60° slice for harmony
export function slugToGradient(slug: string): string {
	let hash = 0;
	for (let i = 0; i < slug.length; i++) {
		hash = (hash << 5) - hash + slug.charCodeAt(i);
		hash |= 0;
	}
	// Base hue from slug, all other hues stay within ±30° of it
	const base = Math.abs(hash % 360);
	const hue = (offset: number) => (base + offset) % 360;
	const p = (n: number) => 10 + Math.abs((hash >> n) % 80);

	return [
		`radial-gradient(ellipse 80% 70% at ${p(0)}% ${p(2)}%, oklch(0.85 0.22 ${hue(0)}) 0%, transparent 45%)`,
		`radial-gradient(ellipse 70% 90% at ${p(4)}% ${p(6)}%, oklch(0.80 0.2 ${hue(20)}) 0%, transparent 40%)`,
		`radial-gradient(ellipse 90% 60% at ${p(8)}% ${p(10)}%, oklch(0.75 0.18 ${hue(-20)}) 0%, transparent 50%)`,
		`radial-gradient(ellipse 60% 80% at ${p(12)}% ${p(14)}%, oklch(0.90 0.15 ${hue(40)}) 0%, transparent 45%)`,
		`oklch(0.82 0.1 ${hue(10)})`,
	].join(", ");
}
