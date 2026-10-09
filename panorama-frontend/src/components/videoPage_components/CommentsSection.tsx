import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { CommentLoginPrompt } from '../modals';
import { ConfirmDialog } from '../ui';
import {
	useCommentThreadUiState,
	useCommentsSection,
	useToast,
} from '../../hooks';
import { ReportModal } from '../modals';
import { CommentComposer, CommentTree } from './comments';
import type {
	CommentTreeActions,
	CommentTreeState,
} from './comments/CommentTreeContext';
import { CommentTreeProvider } from './comments/CommentTreeContext';
import {
	INITIAL_VISIBLE_TOP_LEVEL_COMMENTS,
	buildCommentTree,
	prioritizeRootNodes,
} from './comments/commentTreeLogic';

const CommentsSection = memo(
	function CommentsSection({
		videoId,
		videoAuthorId,
	}: {
		videoId: number;
		videoAuthorId: number;
	}) {
		const { success: showSuccessToast } = useToast();

		const {
			comments,
			currentUserId,
			newCommentText,
			setNewCommentText,
			editingCommentId,
			editingText,
			showLoginPrompt,
			loading,
			setShowLoginPrompt,
			canManageComment,
			setEditingText,
			isAuthenticated,
			handleCreateComment,
			handleCreateReply,
			startEditing,
			cancelEditing,
			handleSaveEdit,
			handleDeleteComment,

			formatTimestamp,
		} = useCommentsSection(videoId);

		const [deletingCommentId, setDeletingCommentId] = useState<
			number | null
		>(null);

		const [reportingCommentId, setReportingCommentId] = useState<
			number | null
		>(null);
		const [visibleRootCount, setVisibleRootCount] = useState(
			INITIAL_VISIBLE_TOP_LEVEL_COMMENTS,
		);

		useEffect(() => {
			setVisibleRootCount(INITIAL_VISIBLE_TOP_LEVEL_COMMENTS);
		}, [videoId]);

		const commentTree = useMemo(
			() => buildCommentTree(comments),
			[comments],
		);

		const { prioritizedRootNodes, directAuthorChildrenById } =
			useMemo(() => {
				return prioritizeRootNodes(
					commentTree,
					currentUserId,
					videoAuthorId,
				);
			}, [videoAuthorId, commentTree, currentUserId]);

		const visibleRootNodes = useMemo(() => {
			return prioritizedRootNodes.slice(0, visibleRootCount);
		}, [prioritizedRootNodes, visibleRootCount]);

		const hiddenRootCount = Math.max(
			0,
			prioritizedRootNodes.length - visibleRootCount,
		);

		const confirmDelete = useCallback(async () => {
			if (deletingCommentId === null) return;
			const deleted = await handleDeleteComment(deletingCommentId);
			if (deleted) {
				showSuccessToast('Comment deleted');
			}
			setDeletingCommentId(null);
		}, [deletingCommentId, handleDeleteComment, showSuccessToast]);

		const openLoginPrompt = useCallback(() => {
			setShowLoginPrompt(true);
		}, [setShowLoginPrompt]);

		const { state: threadState, actions: threadActions } =
			useCommentThreadUiState({
				videoId,
				comments,
				isAuthenticated,
				onRequireAuth: openLoginPrompt,
				createReply: handleCreateReply,
			});

		const handleComposerPaste = useCallback(
			(event: React.ClipboardEvent<HTMLTextAreaElement>) => {
				if (!isAuthenticated) {
					event.preventDefault();
					openLoginPrompt();
				}
			},
			[isAuthenticated, openLoginPrompt],
		);

		const handleComposerSubmit = useCallback(
			(event: React.FormEvent<HTMLFormElement>) => {
				void handleCreateComment(event);
			},
			[handleCreateComment],
		);

		const handleRequestDelete = useCallback((commentId: number) => {
			setDeletingCommentId(commentId);
		}, []);

		const handleRequestReport = useCallback(
			(commentId: number) => {
				if (!isAuthenticated) {
					openLoginPrompt();
					return;
				}

				setReportingCommentId(commentId);
			},
			[isAuthenticated, openLoginPrompt],
		);

		const commentTreeState = useMemo<CommentTreeState>(
			() => ({
				...threadState,
				editingCommentId,
				editingText,
				loading,
			}),
			[threadState, editingCommentId, editingText, loading],
		);

		const commentTreeActions = useMemo<CommentTreeActions>(
			() => ({
				...threadActions,
				canManageComment,
				formatTimestamp,
				startEditing,
				requestDelete: handleRequestDelete,
				reportComment: handleRequestReport,
				cancelEditing,
				saveEdit: handleSaveEdit,
				onEditTextChange: setEditingText,
				onComposerPaste: handleComposerPaste,
			}),
			[
				threadActions,
				canManageComment,
				formatTimestamp,
				startEditing,
				handleRequestDelete,
				handleRequestReport,
				cancelEditing,
				handleSaveEdit,
				setEditingText,
				handleComposerPaste,
			],
		);

		return (
			<div className="flex h-full w-full flex-col gap-4">
				<h2 className="text-heading-sm">Comments</h2>

				<CommentComposer
					value={newCommentText}
					onChange={setNewCommentText}
					onPaste={handleComposerPaste}
					onSubmit={handleComposerSubmit}
					placeholder="Add a comment..."
					disabled={loading}
				/>

				<div className="flex flex-col gap-4">
					<CommentTreeProvider
						state={commentTreeState}
						actions={commentTreeActions}
					>
						<CommentTree
							nodes={visibleRootNodes}
							depth={0}
							videoAuthorId={videoAuthorId}
							directAuthorChildrenById={directAuthorChildrenById}
						/>
					</CommentTreeProvider>
					{hiddenRootCount > 0 ? (
						<button
							type="button"
							onClick={() => {
								setVisibleRootCount(
									prioritizedRootNodes.length,
								);
							}}
							className="btn btn-ghost btn-sm self-start"
						>
							view more ({hiddenRootCount})
						</button>
					) : null}
				</div>

				<CommentLoginPrompt
					open={showLoginPrompt}
					onClose={() => setShowLoginPrompt(false)}
				/>

				<ReportModal
					open={reportingCommentId !== null}
					resourceType="comment"
					resourceId={reportingCommentId ?? 0}
					onClose={() => setReportingCommentId(null)}
				/>

				<ConfirmDialog
					open={deletingCommentId !== null}
					onConfirm={() => void confirmDelete()}
					onCancel={() => setDeletingCommentId(null)}
					message="Are you sure you want to delete this comment?"
					confirmLabel="Delete"
					cancelLabel="Cancel"
					loading={loading}
				/>
			</div>
		);
	},
	(prev, next) =>
		prev.videoId === next.videoId &&
		prev.videoAuthorId === next.videoAuthorId,
);

export default CommentsSection;
