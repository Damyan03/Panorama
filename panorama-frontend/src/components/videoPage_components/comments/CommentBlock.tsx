import { memo } from 'react';
import CommentIdentity from './CommentIdentity';

interface CommentBlockProps {
	author: string;
	timestamp: string;
	content: string;
	authorUsername?: string;
	avatarUrl?: string;
	labels?: string[];
	subtitle?: string;
}

function CommentBlock({
	author,
	timestamp,
	content,
	authorUsername,
	avatarUrl,
	labels,
	subtitle,
}: CommentBlockProps) {
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<CommentIdentity
				author={author}
				timestamp={timestamp}
				authorUsername={authorUsername}
				avatarUrl={avatarUrl}
				labels={labels}
				subtitle={subtitle}
			/>
			<p className="text-body wrap-break-word">{content}</p>
		</div>
	);
}

export default memo(CommentBlock);
