import type { CommentItem as ApiCommentItem } from '../../../api/comments';

export const INITIAL_VISIBLE_TOP_LEVEL_COMMENTS = 2;

export type CommentTreeNode = {
	comment: ApiCommentItem;
	children: CommentTreeNode[];
};

export type DirectAuthorChildrenById = Map<number, CommentTreeNode[]>;

type TopLevelPriorityParams = {
	currentUserId: number | null;
	videoAuthorId: number;
	hasDirectAuthorReply: boolean;
};

type ThreadPreviewStateParams = {
	node: CommentTreeNode;
	depth: number;
	isExpanded: boolean;
	directAuthorChildrenById: DirectAuthorChildrenById;
};

export type ThreadPreviewState = {
	visibleChildren: CommentTreeNode[];
	hiddenCount: number;
	shouldShowCollapsedRepliesButton: boolean;
	shouldShowViewMoreButton: boolean;
};

export function compareCommentsByDate(a: ApiCommentItem, b: ApiCommentItem) {
	const aTime = Date.parse(a.createdAt);
	const bTime = Date.parse(b.createdAt);
	if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
		return a.id - b.id;
	}

	if (aTime === bTime) {
		return a.id - b.id;
	}

	return aTime - bTime;
}

export function buildCommentTree(items: ApiCommentItem[]): CommentTreeNode[] {
	const nodesById = new Map<number, CommentTreeNode>();

	for (const comment of items) {
		nodesById.set(comment.id, { comment, children: [] });
	}

	const roots: CommentTreeNode[] = [];

	for (const comment of items) {
		const node = nodesById.get(comment.id);
		if (!node) continue;

		const parentId = comment.parentCommentId ?? null;
		if (parentId === null) {
			roots.push(node);
			continue;
		}

		const parentNode = nodesById.get(parentId);
		if (
			!parentNode ||
			parentNode.comment.videoId !== comment.videoId
		) {
			roots.push(node);
			continue;
		}

		parentNode.children.push(node);
	}

	const sortBranch = (nodes: CommentTreeNode[]) => {
		nodes.sort((left, right) =>
			compareCommentsByDate(left.comment, right.comment),
		);
		nodes.forEach((node) => sortBranch(node.children));
	};

	sortBranch(roots);
	return roots;
}

export function countTreeNodes(nodes: CommentTreeNode[]): number {
	let total = 0;
	for (const node of nodes) {
		total += 1 + countTreeNodes(node.children);
	}
	return total;
}

function buildDirectAuthorChildrenById(
	nodes: CommentTreeNode[],
	videoAuthorId: number,
): DirectAuthorChildrenById {
	const directAuthorChildrenById = new Map<number, CommentTreeNode[]>();

	const walk = (node: CommentTreeNode) => {
		directAuthorChildrenById.set(
			node.comment.id,
			node.children.filter(
				(child) => child.comment.userId === videoAuthorId,
			),
		);

		for (const child of node.children) {
			walk(child);
		}
	};

	for (const node of nodes) {
		walk(node);
	}

	return directAuthorChildrenById;
}

function getTopLevelCommentPriority(
	comment: ApiCommentItem,
	{
		currentUserId,
		videoAuthorId,
		hasDirectAuthorReply,
	}: TopLevelPriorityParams,
) {
	if (comment.userId === videoAuthorId) {
		return 0;
	}

	if (currentUserId !== null && comment.userId === currentUserId) {
		return 1;
	}

	if (hasDirectAuthorReply) {
		return 2;
	}

	return 3;
}

export function prioritizeRootNodes(
	commentTree: CommentTreeNode[],
	currentUserId: number | null,
	videoAuthorId: number,
) {
	const directAuthorChildrenById = buildDirectAuthorChildrenById(
		commentTree,
		videoAuthorId,
	);

	const prioritizedRootNodes = [...commentTree].sort((left, right) => {
		const leftHasDirectAuthorReply =
			(directAuthorChildrenById.get(left.comment.id)?.length ?? 0) > 0;
		const rightHasDirectAuthorReply =
			(directAuthorChildrenById.get(right.comment.id)?.length ?? 0) > 0;

		const leftPriority = getTopLevelCommentPriority(left.comment, {
			currentUserId,
			videoAuthorId,
			hasDirectAuthorReply: leftHasDirectAuthorReply,
		});
		const rightPriority = getTopLevelCommentPriority(right.comment, {
			currentUserId,
			videoAuthorId,
			hasDirectAuthorReply: rightHasDirectAuthorReply,
		});

		if (leftPriority !== rightPriority) {
			return leftPriority - rightPriority;
		}

		return compareCommentsByDate(left.comment, right.comment);
	});

	return {
		prioritizedRootNodes,
		directAuthorChildrenById,
	};
}

export function getThreadPreviewState({
	node,
	depth,
	isExpanded,
	directAuthorChildrenById,
}: ThreadPreviewStateParams): ThreadPreviewState {
	const hasChildren = node.children.length > 0;
	const directAuthorChildren =
		depth === 0
			? (directAuthorChildrenById.get(node.comment.id) ?? [])
			: [];
	const hasDirectAuthorChild = directAuthorChildren.length > 0;
	const shouldShowAuthorPreview =
		depth === 0 && hasDirectAuthorChild && !isExpanded;
	const previewChildren = shouldShowAuthorPreview
		? [directAuthorChildren[0]]
		: [];
	const visibleChildren = isExpanded ? node.children : previewChildren;
	const hiddenCount = hasChildren
		? Math.max(
				0,
				countTreeNodes(node.children) - countTreeNodes(visibleChildren),
			)
		: 0;

	return {
		visibleChildren,
		hiddenCount,
		shouldShowCollapsedRepliesButton:
			hasChildren && !isExpanded && !shouldShowAuthorPreview,
		shouldShowViewMoreButton: shouldShowAuthorPreview && hiddenCount > 0,
	};
}
