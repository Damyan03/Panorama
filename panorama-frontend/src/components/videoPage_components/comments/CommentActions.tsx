import DotsDropdown from '../../ui/DotsDropdown';

type Props = {
	canManage: boolean;
	onReply: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onReport: () => void;
	disabled?: boolean;
};

export default function CommentActions({
	canManage,
	onReply,
	onEdit,
	onDelete,
	onReport,
}: Props) {
	if (canManage) {
		return (
			<div className="flex items-center justify-end">
				<div className="ml-2">
					<DotsDropdown
						items={[
							{ label: 'Reply', onClick: onReply },
							{ label: 'Edit', onClick: onEdit },
							{
								label: 'Delete',
								onClick: onDelete,
								destructive: true,
							},
						]}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-end">
			<div className="ml-2">
				<DotsDropdown
					items={[
						{ label: 'Reply', onClick: onReply },
						{ label: 'Report', onClick: onReport },
					]}
				/>
			</div>
		</div>
	);
}
