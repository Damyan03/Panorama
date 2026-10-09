import { createContext, useContext, useMemo } from 'react';
import type { ClipboardEvent, ReactNode } from 'react';
import type { CommentItem as ApiCommentItem } from '../../../api/comments';
import type {
	CommentThreadUiActions,
	CommentThreadUiState,
} from '../../../hooks/comments/useCommentThreadUiState';

export type CommentTreeState = CommentThreadUiState & {
	editingCommentId: number | null;
	editingText: string;
	loading: boolean;
};

export type CommentTreeActions = CommentThreadUiActions & {
	canManageComment: (comment: ApiCommentItem) => boolean;
	formatTimestamp: (comment: ApiCommentItem) => string;
	startEditing: (comment: ApiCommentItem) => void;
	requestDelete: (commentId: number) => void;
	reportComment: (commentId: number) => void;
	cancelEditing: () => void;
	saveEdit: (commentId: number) => void | Promise<void>;
	onEditTextChange: (value: string) => void;
	onComposerPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
};

type CommentTreeContextValue = {
	state: CommentTreeState;
	actions: CommentTreeActions;
};

const CommentTreeContext = createContext<CommentTreeContextValue | null>(null);

export function CommentTreeProvider({
	state,
	actions,
	children,
}: {
	state: CommentTreeState;
	actions: CommentTreeActions;
	children: ReactNode;
}) {
	const value = useMemo(
		() => ({
			state,
			actions,
		}),
		[state, actions],
	);

	return (
		<CommentTreeContext.Provider value={value}>
			{children}
		</CommentTreeContext.Provider>
	);
}

export function useCommentTreeContext(): CommentTreeContextValue {
	const value = useContext(CommentTreeContext);
	if (!value) {
		throw new Error(
			'useCommentTreeContext must be used inside CommentTreeProvider',
		);
	}

	return value;
}
