import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
	addComment,
	deleteComment,
	getComments,
	updateComment,
} from '../../api/comments';
import type { CommentItem } from '../../api/comments';
import { useAuth } from '../../auth/AuthContext';
import { getRelativeTime } from '../../utils/formatters/time';

export function useCommentsSection(videoId: number) {
	const [comments, setComments] = useState<CommentItem[]>([]);
	const [newCommentText, setNewCommentText] = useState('');
	const [editingCommentId, setEditingCommentId] = useState<number | null>(
		null,
	);
	const [editingText, setEditingText] = useState('');
	const [showLoginPrompt, setShowLoginPrompt] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { user, isAuthenticated, isReady } = useAuth();

	useEffect(() => {
		let active = true;
		setError(null);
		void getComments(videoId)
			.then((items) => {
				if (!active) return;
				setComments(items);
			})
			.catch(() => {
				if (active) setComments([]);
			});

		return () => {
			active = false;
		};
	}, [videoId]);

	const currentUserId = user?.id ?? null;

	const canManageComment = useCallback(
		(comment: CommentItem) =>
			currentUserId !== null && comment.userId === currentUserId,
		[currentUserId],
	);

	const createCommentInternal = useCallback(
		async (rawText: string, parentCommentId: number | null = null) => {
			if (!isReady || !isAuthenticated) {
				setShowLoginPrompt(true);
				return null;
			}

			const text = rawText.trim();
			if (!text || loading) return null;

			setLoading(true);
			setError(null);
			try {
				const created = await addComment(
					videoId,
					text,
					parentCommentId,
				);
				setComments((current) => {
					const filtered = current.filter((c) => c.id !== created.id);
					return [...filtered, created];
				});
				return created;
			} catch {
				setError('Unable to post comment.');
				return null;
			} finally {
				setLoading(false);
			}
		},
		[videoId, isReady, isAuthenticated, loading],
	);

	const handleCreateComment = useCallback(
		async (event: FormEvent<HTMLFormElement> | null) => {
			if (event) event.preventDefault();

			const created = await createCommentInternal(newCommentText, null);
			if (created) {
				setNewCommentText('');
			}
		},
		[createCommentInternal, newCommentText],
	);

	const handleCreateReply = useCallback(
		async (parentCommentId: number, text: string) => {
			const created = await createCommentInternal(text, parentCommentId);
			return created !== null;
		},
		[createCommentInternal],
	);

	const startEditing = useCallback((comment: CommentItem) => {
		setEditingCommentId(comment.id);
		setEditingText(comment.text);
		setError(null);
	}, []);

	const cancelEditing = useCallback(() => {
		setEditingCommentId(null);
		setEditingText('');
	}, []);

	const handleSaveEdit = useCallback(
		async (commentId: number) => {
			if (!isReady || !isAuthenticated || loading) return;

			const text = editingText.trim();
			if (!text) {
				setError('Comment cannot be empty.');
				return;
			}

			setLoading(true);
			setError(null);
			try {
				const updated = await updateComment(
					videoId,
					commentId,
					text,
				);
				setComments((current) =>
					current.map((comment) =>
						comment.id === updated.id ? updated : comment,
					),
				);
				cancelEditing();
			} catch {
				setError('Unable to update comment.');
			} finally {
				setLoading(false);
			}
		},
		[
			videoId,
			editingText,
			isReady,
			isAuthenticated,
			loading,
			cancelEditing,
		],
	);

	const handleDeleteComment = useCallback(
		async (commentId: number) => {
			if (!isReady || !isAuthenticated || loading) return false;

			setLoading(true);
			setError(null);
			try {
				await deleteComment(videoId, commentId);
				setComments((current) =>
					current.filter((comment) => comment.id !== commentId),
				);
				if (editingCommentId === commentId) cancelEditing();
				return true;
			} catch {
				setError('Unable to delete comment.');
				return false;
			} finally {
				setLoading(false);
			}
		},
		[
			videoId,
			isReady,
			isAuthenticated,
			loading,
			editingCommentId,
			cancelEditing,
		],
	);

	const handleReportComment = useCallback(
		async (commentId: number) => {
			if (!isReady || !isAuthenticated) {
				setShowLoginPrompt(true);
				return;
			}

			setLoading(true);
			setError(null);
			try {
				// TODO(comments): wire to real `/comments/{id}/report` endpoint.
				void commentId;
				setError('Report submitted.');
			} catch {
				setError('Unable to report comment.');
			} finally {
				setLoading(false);
			}
		},
		[isReady, isAuthenticated],
	);

	const formatTimestamp = useCallback((comment: CommentItem) => {
		if (comment.updatedAt)
			return `edited ${getRelativeTime(comment.updatedAt)}`;
		return getRelativeTime(comment.createdAt);
	}, []);

	return {
		comments,
		currentUserId,
		newCommentText,
		setNewCommentText,
		editingCommentId,
		editingText,
		setEditingText,
		showLoginPrompt,
		loading,
		error,
		setShowLoginPrompt,
		isAuthenticated,
		isReady,
		canManageComment,
		handleCreateComment,
		handleCreateReply,
		startEditing,
		cancelEditing,
		handleSaveEdit,
		handleDeleteComment,
		handleReportComment,
		formatTimestamp,
	};
}

export default useCommentsSection;
