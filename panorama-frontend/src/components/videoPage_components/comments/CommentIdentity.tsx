import { Link } from 'react-router-dom';

type Props = {
	author: string;
	timestamp: string;
	authorUsername?: string;
	avatarUrl?: string;
	labels?: string[];
	subtitle?: string;
};

export default function CommentIdentity({
	author,
	timestamp,
	authorUsername,
	avatarUrl,
	labels,
	subtitle,
}: Props) {
	const profileHref = authorUsername?.trim() ? `/u/${authorUsername}` : null;
	const normalizedLabels = (labels ?? [])
		.map((label) => label.trim())
		.filter((label) => label.length > 0)
		.slice(0, 4);
	const hasBadges = Boolean(subtitle) || normalizedLabels.length > 0;
	const roleBadgeClass =
		subtitle === 'Admin'
			? 'badge badge-role-admin'
			: 'badge badge-role-default';

	const avatar = avatarUrl ? (
		<img
			src={avatarUrl}
			alt={author}
			className="h-10 w-10 shrink-0 rounded-full object-cover"
		/>
	) : (
		<div className="h-10 w-10 shrink-0 rounded-full bg-ui-subtle" />
	);

	return (
		<div className="flex items-center gap-4">
			{profileHref ? (
				<Link
					to={profileHref}
					aria-label={`View ${author} profile`}
					className="rounded-full focus:outline-none focus:ring-2 focus:ring-focus-ring"
				>
					{avatar}
				</Link>
			) : (
				avatar
			)}
			<div className="flex min-w-0 flex-col">
				<div className="flex flex-wrap flex-col">
					<div className="flex gap-2 items-center">
						<span className="font-bold">{author}</span>
						<span className="text-muted">{timestamp}</span>
					</div>
					{hasBadges ? (
						<div className="mt-1 flex flex-wrap items-center gap-1">
							{subtitle ? (
								<span className={roleBadgeClass}>
									{subtitle}
								</span>
							) : null}
							{normalizedLabels.map((label) => (
								<span
									key={label}
									className="badge badge-secondary"
								>
									{label}
								</span>
							))}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
