import { requestJson } from './client';

export interface CommentItem {
	id: number;
	videoId: number;
	userId: number;
	parentCommentId?: number | null;
	text: string;
	createdAt: string;
	updatedAt?: string | null;
	author?: {
		username?: string | null;
		displayName?: string | null;
		profilePicUrl?: string | null;
		labels?: string[] | null;
	} | null;
	isAdmin: boolean;
}

export async function getComments(videoId: number): Promise<CommentItem[]> {
	const result = await requestJson<{ items: CommentItem[] }>(
		`/videos/${videoId}/comments`,
	);
	return result.items ?? [];
}

export function addComment(
	videoId: number,
	text: string,
	parentCommentId?: number | null,
): Promise<CommentItem> {
	return requestJson<CommentItem>(`/videos/${videoId}/comments`, {
		method: 'POST',
		body: JSON.stringify({
			text,
			parentCommentId: parentCommentId ?? null,
		}),
		headers: { 'Content-Type': 'application/json' },
	});
}

export function updateComment(
	videoId: number,
	commentId: number,
	text: string,
): Promise<CommentItem> {
	return requestJson<CommentItem>(
		`/videos/${videoId}/comments/${commentId}`,
		{
			method: 'PUT',
			body: JSON.stringify({ text }),
			headers: { 'Content-Type': 'application/json' },
		},
	);
}

export function deleteComment(
	videoId: number,
	commentId: number,
): Promise<void> {
	return requestJson<void>(
		`/videos/${videoId}/comments/${commentId}`,
		{ method: 'DELETE' },
	);
}
