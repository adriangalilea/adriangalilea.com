import { getFeedContent } from "@/lib/content";
import { MasonryGrid } from "@/components/masonry";

export default function Home() {
	const content = getFeedContent();

	return (
		<main className="relative z-[1]">
			<div className="mx-auto w-full max-w-[90rem] px-4 py-6">
				<MasonryGrid items={content} />
			</div>
		</main>
	);
}
