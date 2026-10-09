import { memo, useEffect, useMemo, useState } from 'react';
import { getTrendingTags } from '../../api/tags';
import useDesktopDragScroll from '../../hooks/useDesktopDragScroll';

interface TrendingTag {
	name: string;
	count: number;
}

interface TrendingTagsProps {
	selectedTags: string[];
	onTagToggle: (tag: string) => void;
}

const TrendingTags = memo(function TrendingTags({
	selectedTags,
	onTagToggle,
}: TrendingTagsProps) {
	const [tags, setTags] = useState<TrendingTag[] | null>(null);
	const dragScrollHandlers = useDesktopDragScroll();
	const selectedTagSet = useMemo(
		() =>
			new Set(
				selectedTags
					.map((tag) => tag.trim().toLowerCase())
					.filter(Boolean),
			),
		[selectedTags],
	);

	useEffect(() => {
		let active = true;
		void getTrendingTags(30, 10)
			.then((result) => {
				if (active) setTags(result ?? []);
			})
			.catch(() => {
				if (active) setTags([]);
			});

		return () => {
			active = false;
		};
	}, []);

	if (!tags || tags.length === 0) {
		return null;
	}

	return (
		<div
			className="flex gap-2 overflow-x-auto scrollbar-thin-white cursor-grab active:cursor-grabbing"
			{...dragScrollHandlers}
		>
			{tags.map((t) => {
				const normalizedTag = t.name.trim().toLowerCase();
				const isSelected = selectedTagSet.has(normalizedTag);

				return (
					<button
						key={t.name}
						type="button"
						onClick={() => onTagToggle(t.name)}
						className={
							isSelected
								? 'px-2 rounded border border-accent-500 text-accent-500'
								: 'text-text-secondary px-2 rounded border border-overlay-light-30'
						}
					>
						{t.name}
					</button>
				);
			})}
		</div>
	);
});

export default TrendingTags;
