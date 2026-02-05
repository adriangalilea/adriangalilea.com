"use client";

import { useQueryState } from "nuqs";

type Props = {
	tags: string[];
};

export function TagFilter({ tags }: Props) {
	const [currentTag, setTag] = useQueryState("tag", { shallow: false });

	return (
		<div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
			<button
				type="button"
				onClick={() => setTag(null)}
				className={`text-sm transition-colors ${
					!currentTag ? "text-foreground" : "text-foreground-lowest hover:text-foreground"
				}`}
			>
				All
			</button>
			{tags.map((tag) => (
				<button
					key={tag}
					type="button"
					onClick={() => setTag(tag)}
					className={`text-sm transition-colors ${
						currentTag === tag ? "text-foreground" : "text-foreground-lowest hover:text-foreground"
					}`}
				>
					{tag}
				</button>
			))}
		</div>
	);
}
