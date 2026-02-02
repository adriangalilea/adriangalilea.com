// Deterministic subtle gradient placeholder from a slug
// Same family feel across all placeholders — only hue shifts
export function slugToGradient(slug: string): string {
	let hash = 0;
	for (let i = 0; i < slug.length; i++) {
		hash = (hash << 5) - hash + slug.charCodeAt(i);
		hash |= 0;
	}
	const h = Math.abs(hash % 360);
	return [
		`radial-gradient(ellipse at 30% 20%, oklch(0.30 0.06 ${h}) 0%, transparent 60%)`,
		`radial-gradient(ellipse at 70% 80%, oklch(0.25 0.04 ${(h + 40) % 360}) 0%, transparent 60%)`,
		`oklch(0.13 0 0)`,
	].join(", ");
}
