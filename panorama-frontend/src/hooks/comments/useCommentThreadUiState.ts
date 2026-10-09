import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { FormEvent } from 'react';
import type { CommentItem as ApiCommentItem } from '../../api/comments';

type State = {
	replyingToCommentId: number | null;
	replyText: string;
	expandedThreadIds: Set<number>;
};

type Action =
	| { type: 'reset' }
	| { type: 'startReply'; commentId: number }
	| { type: 'cancelReply' }
	| { type: 'setReplyText'; value: string }
	| { type: 'expandThread'; commentId: number }
	| { type: 'collapseThread'; commentId: number };

type UseCommentThreadUiStateArgs = {
	videoId: number;
	comments: ApiCommentItem[];
	isAuthenticated: boolean;
	onRequireAuth: () => void;
	createReply: (parentCommentId: number, text: string) => Promise<boolean>;
};

export type CommentThreadUiState = {
	replyingToCommentId: number | null;
	replyText: string;
	expandedThreadIds: Set<number>;
};

export type CommentThreadUiActions = {
	requestReply: (commentId: number) => void;
	cancelReply: () => void;
	setReplyText: (value: string) => void;
	submitReply: (
		event: FormEvent<HTMLFormElement>,
		parentCommentId: number,
	) => Promise<void>;
	expandThread: (commentId: number) => void;
	collapseThread: (commentId: number) => void;
};

function createInitialState(): State {
	return {
		replyingToCommentId: null,
		replyText: '',
		expandedThreadIds: new Set<number>(),
	};
}

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'reset':
			return createInitialState();
		case 'startReply': {
			const nextReplyTarget =
				state.replyingToCommentId === action.commentId
					? null
					: action.commentId;

			if (
				nextReplyTarget === state.replyingToCommentId &&
				state.replyText === ''
			) {
				return state;
			}

			return {
				...state,
				replyingToCommentId: nextReplyTarget,
				replyText: '',
			};
		}
		case 'cancelReply':
			if (state.replyingToCommentId === null && state.replyText === '') {
				return state;
			}

			return {
				...state,
				replyingToCommentId: null,
				replyText: '',
			};
		case 'setReplyText':
			if (state.replyText === action.value) {
				return state;
			}

			return {
				...state,
				replyText: action.value,
			};
		case 'expandThread': {
			if (state.expandedThreadIds.has(action.commentId)) {
				return state;
			}

			const nextExpanded = new Set(state.expandedThreadIds);
			nextExpanded.add(action.commentId);

			return {
				...state,
				expandedThreadIds: nextExpanded,
			};
		}
		case 'collapseThread': {
			if (!state.expandedThreadIds.has(action.commentId)) {
				return state;
			}

			const nextExpanded = new Set(state.expandedThreadIds);
			nextExpanded.delete(action.commentId);

			return {
				...state,
				expandedThreadIds: nextExpanded,
			};
		}
	}
}

export function useCommentThreadUiState({
	videoId,
	comments,
	isAuthenticated,
	onRequireAuth,
	createReply,
}: UseCommentThreadUiStateArgs): {
	state: CommentThreadUiState;
	actions: CommentThreadUiActions;
} {
	const [state, dispatch] = useReducer(
		reducer,
		undefined,
		createInitialState,
	);

	useEffect(() => {
		dispatch({ type: 'reset' });
	}, [videoId]);

	useEffect(() => {
		if (state.replyingToCommentId === null) {
			return;
		}

		const hasReplyTarget = comments.some(
			(comment) => comment.id === state.replyingToCommentId,
		);
		if (!hasReplyTarget) {
			dispatch({ type: 'cancelReply' });
		}
	}, [comments, state.replyingToCommentId]);

	const requestReply = useCallback(
		(commentId: number) => {
			if (!isAuthenticated) {
				onRequireAuth();
				return;
			}

			dispatch({ type: 'startReply', commentId });
		},
		[isAuthenticated, onRequireAuth],
	);

	const cancelReply = useCallback(() => {
		dispatch({ type: 'cancelReply' });
	}, []);

	const setReplyText = useCallback((value: string) => {
		dispatch({ type: 'setReplyText', value });
	}, []);

	const submitReply = useCallback(
		async (event: FormEvent<HTMLFormElement>, parentCommentId: number) => {
			event.preventDefault();
			const created = await createReply(parentCommentId, state.replyText);
			if (!created) {
				return;
			}

			dispatch({ type: 'cancelReply' });
		},
		[createReply, state.replyText],
	);

	const expandThread = useCallback((commentId: number) => {
		dispatch({ type: 'expandThread', commentId });
	}, []);

	const collapseThread = useCallback((commentId: number) => {
		dispatch({ type: 'collapseThread', commentId });
	}, []);

	const actions = useMemo(
		() => ({
			requestReply,
			cancelReply,
			setReplyText,
			submitReply,
			expandThread,
			collapseThread,
		}),
		[
			requestReply,
			cancelReply,
			setReplyText,
			submitReply,
			expandThread,
			collapseThread,
		],
	);

	return {
		state,
		actions,
	};
}
