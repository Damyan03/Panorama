import { memo } from 'react';
import type { ReactNode } from 'react';
import CommentItem from './CommentItem';
import {
	getThreadPreviewState,
	type CommentTreeNode,
	type DirectAuthorChildrenById,
} from './commentTreeLogic';
import { useCommentTreeContext } from './CommentTreeContext';

type CommentTreeProps = {
	nodes: CommentTreeNode[];
	depth: number;
	videoAuthorId: number;
	directAuthorChildrenById: DirectAuthorChildrenById;
};

function CommentTree({
	nodes,
	depth,
	videoAuthorId,
	directAuthorChildrenById,
}: CommentTreeProps) {
	const { state, actions } = useCommentTreeContext();

	const renderNodes = (
		currentNodes: CommentTreeNode[],
		currentDepth: number,
	): ReactNode => {
		return currentNodes.map((node) => {
			const comment = node.comment;
			const hasChildren = node.children.length > 0;
			const canManage = actions.canManageComment(comment);
			const isEditing = state.editingCommentId === comment.id;
			const isReplying = state.replyingToCommentId === comment.id;
			const isExpanded =
				hasChildren && state.expandedThreadIds.has(comment.id);
			const {
				visibleChildren,
				hiddenCount,
				shouldShowCollapsedRepliesButton,
				shouldShowViewMoreButton,
			} = getThreadPreviewState({
				node,
				depth: currentDepth,
				isExpanded,
				directAuthorChildrenById,
			});

			const handleHierarchyLineClick = () => {
				if (!hasChildren) return;

				if (isExpanded) {
					actions.collapseThread(comment.id);
					return;
				}

				actions.expandThread(comment.id);
			};

			return (
				<div key={comment.id}>
					<CommentItem
						comment={comment}
						canManage={canManage}
						isEditing={isEditing}
						editingText={isEditing ? state.editingText : ''}
						loading={state.loading}
						formattedTimestamp={actions.formatTimestamp(comment)}
						startEditing={actions.startEditing}
						requestReply={actions.requestReply}
						requestDelete={actions.requestDelete}
						reportComment={actions.reportComment}
						cancelEditing={actions.cancelEditing}
						saveEdit={actions.saveEdit}
						onEditTextChange={actions.onEditTextChange}
						videoAuthorId={videoAuthorId}
					/>

					{isReplying ? (
						<form
							onSubmit={(event) => {
								void actions.submitReply(event, comment.id);
							}}
							className="card mt-3 ml-2 flex flex-col gap-3 p-4"
						>
							<textarea
								autoFocus
								value={state.replyText}
								onChange={(event) =>
									actions.setReplyText(event.target.value)
								}
								onPaste={actions.onComposerPaste}
								placeholder="Write a reply..."
								maxLength={2000}
								disabled={state.loading}
								className="input min-h-20 resize-y"
							/>
							<div className="flex items-center justify-end gap-2">
								<button
									type="button"
									onClick={actions.cancelReply}
									disabled={state.loading}
									className="btn btn-ghost btn-sm"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={
										state.loading ||
										state.replyText.trim().length === 0
									}
									className="btn btn-primary btn-sm"
								>
									Post reply
								</button>
							</div>
						</form>
					) : null}

					{shouldShowCollapsedRepliesButton ? (
						<div className="mt-3 pl-2">
							<button
								type="button"
								onClick={() => {
									actions.expandThread(comment.id);
								}}
								className="btn btn-ghost btn-sm"
							>
								view replies ({hiddenCount}{' '}
								{hiddenCount === 1 ? 'reply' : 'replies'})
							</button>
						</div>
					) : null}

					{visibleChildren.length > 0 ? (
						<div className="relative mt-3 pl-4">
							{isExpanded ? (
								<button
									type="button"
									onClick={handleHierarchyLineClick}
									className="absolute left-0 top-0 bottom-0 w-2 border-l border-border/60 transition-colors hover:border-primary/70"
									aria-label="Collapse comment branch"
									title="Collapse replies"
								/>
							) : null}
							<div className="flex flex-col gap-3">
								{renderNodes(visibleChildren, currentDepth + 1)}
							</div>
						</div>
					) : null}

					{shouldShowViewMoreButton ? (
						<div className="mt-3 pl-4">
							<button
								type="button"
								onClick={() => {
									actions.expandThread(comment.id);
								}}
								className="btn btn-ghost btn-sm"
							>
								view more ({hiddenCount})
							</button>
						</div>
					) : null}
				</div>
			);
		});
	};

	return <>{renderNodes(nodes, depth)}</>;
}

export default memo(CommentTree);
