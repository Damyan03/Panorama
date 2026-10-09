import { memo, useCallback } from 'react';
import type { CommentItem as ApiCommentItem } from '../../../api/comments';
import CommentActions from './CommentActions';
import CommentBlock from './CommentBlock';
import CommentEditorForm from './CommentEditorForm';

type Props = {
	comment: ApiCommentItem;
	canManage: boolean;
	isEditing: boolean;
	editingText: string;
	loading: boolean;
	formattedTimestamp: string;
	startEditing: (comment: ApiCommentItem) => void;
	requestReply: (commentId: number) => void;
	requestDelete: (commentId: number) => void;
	reportComment: (commentId: number) => void | Promise<void>;
	cancelEditing: () => void;
	saveEdit: (commentId: number) => void | Promise<void>;
	onEditTextChange: (value: string) => void;
	videoAuthorId: number;
};

function CommentItem({
	comment,
	canManage,
	isEditing,
	editingText,
	loading,
	formattedTimestamp,
	startEditing,
	requestReply,
	requestDelete,
	reportComment,
	cancelEditing,
	saveEdit,
	onEditTextChange,
	videoAuthorId,
}: Props) {
	const author = comment.author?.displayName ?? 'Unknown';
	const authorUsername = comment.author?.username?.trim() || undefined;
	const avatarUrl = comment.author?.profilePicUrl ?? undefined;
	const authorLabels = (comment.author?.labels ?? []).filter(
		(label) => label.trim().length > 0,
	);
	const commentId = comment.id;

	const getSubtitle = (): string | undefined => {
		if (comment.userId === videoAuthorId) {
			return 'Author';
		}
		return comment.isAdmin ? 'Admin' : undefined;
	};

	const handleEdit = useCallback(() => {
		startEditing(comment);
	}, [startEditing, comment]);

	const handleDelete = useCallback(() => {
		requestDelete(commentId);
	}, [requestDelete, commentId]);

	const handleReply = useCallback(() => {
		requestReply(commentId);
	}, [requestReply, commentId]);

	const handleReport = useCallback(() => {
		void reportComment(commentId);
	}, [reportComment, commentId]);

	const handleSave = useCallback(() => {
		void saveEdit(commentId);
	}, [saveEdit, commentId]);

	return (
		<div className="card p-4">
			{isEditing ? (
				<CommentEditorForm
					author={author}
					timestamp={formattedTimestamp}
					authorUsername={authorUsername}
					avatarUrl={avatarUrl}
					labels={authorLabels}
					value={editingText}
					onChange={onEditTextChange}
					onCancel={cancelEditing}
					onSave={handleSave}
					disabled={loading}
				/>
			) : (
				<div className="flex justify-between gap-3">
					<CommentBlock
						author={author}
						timestamp={formattedTimestamp}
						authorUsername={authorUsername}
						content={comment.text}
						avatarUrl={avatarUrl}
						labels={authorLabels}
						subtitle={getSubtitle()}
					/>
					<CommentActions
						canManage={canManage}
						onReply={handleReply}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onReport={handleReport}
					/>
				</div>
			)}
		</div>
	);
}

export default memo(CommentItem);
