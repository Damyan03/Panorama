import { memo } from 'react';

const Tags = memo(
	function Tags({ tags }: { tags: string[] }) {
		if (!tags || tags.length === 0) {
			return null;
		}

		return (
			<div className="flex w-full flex-col gap-2">
				<h2 className="text-heading-sm">Tags</h2>
				<div className="flex gap-2 overflow-x-auto pb-1">
					{tags.map((tag) => (
						<span
							key={tag}
							className="badge badge-secondary shrink-0"
						>
							{tag}
						</span>
					))}
				</div>
			</div>
		);
	},
	(prev, next) => prev.tags === next.tags,
);

export default Tags;
