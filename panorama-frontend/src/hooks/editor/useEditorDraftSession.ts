import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type Dispatch,
	type SetStateAction,
} from 'react';
import { ApiError } from '../../api/client';
import {
	videoTitleToSlug,
	getVideoById,
	getFeaturedVideo,
	getMyDraftVideos,
	saveMyDraftVideo,
} from '../../api/videos';
import { normalizeDraft } from '../../utils/editor/draft';
import type { VideoData } from '../../types/video';

interface UseEditorDraftSessionParams {
	slug: string | undefined;
	videoDraft: VideoData | null;
	selectedImageId: number | null;
	setVideoDraft: Dispatch<SetStateAction<VideoData | null>>;
	setSelectedImageId: Dispatch<SetStateAction<number | null>>;
}

export function useEditorDraftSession({
	slug,
	videoDraft,
	selectedImageId,
	setVideoDraft,
	setSelectedImageId,
}: UseEditorDraftSessionParams) {
	const isDraftSession = Boolean((slug ?? '').trim());
	const originalDraftRef = useRef<VideoData | null>(null);
	const originalSelectedImageIdRef = useRef<number | null>(null);
	const isMountedRef = useRef(true);
	const [isLoading, setIsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		let active = true;
		const requestedSlug = (slug ?? '').trim();

		setIsLoading(true);
		setError(null);
		setVideoDraft(null);
		setSelectedImageId(null);
		originalDraftRef.current = null;
		originalSelectedImageIdRef.current = null;

		const loadDraft = async () => {
			if (requestedSlug.length > 0) {
				const result = await getMyDraftVideos();
				const found = result.items.find(
					(item) =>
						videoTitleToSlug(item.title ?? '') ===
						requestedSlug,
				);

				if (!found) {
					if (active) {
						setVideoDraft(null);
					}
					return;
				}

				return await getVideoById(found.id);
			}

			return await getFeaturedVideo();
		};

		void loadDraft()
			.then((nextVideo) => {
				if (!active) {
					return;
				}

				const normalized = normalizeDraft(nextVideo);
				setVideoDraft(normalized);
				originalDraftRef.current = normalized;
				originalSelectedImageIdRef.current =
					normalized?.content.images[0]?.id ?? null;
				setSelectedImageId(originalSelectedImageIdRef.current);
			})
			.catch(() => {
				if (active) {
					setVideoDraft(null);
				}
			})
			.finally(() => {
				if (active) {
					setIsLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [setVideoDraft, setSelectedImageId, slug]);

	const handleDiscardChanges = useCallback(() => {
		if (!isDraftSession || !originalDraftRef.current) {
			return;
		}

		setError(null);
		setVideoDraft(originalDraftRef.current);
		setSelectedImageId(originalSelectedImageIdRef.current);
	}, [isDraftSession, setVideoDraft, setSelectedImageId]);

	const handleSaveDraft = useCallback(async () => {
		if (!isDraftSession || !videoDraft) {
			return;
		}

		// Snapshot persisted values so edits made during save are not marked as saved.
		const draftSnapshot = videoDraft;
		const selectedImageIdSnapshot = selectedImageId;

		setIsSaving(true);
		setError(null);
		try {
			await saveMyDraftVideo(draftSnapshot);
			if (!isMountedRef.current) {
				return;
			}
			originalDraftRef.current = draftSnapshot;
			originalSelectedImageIdRef.current = selectedImageIdSnapshot;
		} catch (err: unknown) {
			if (!isMountedRef.current) {
				return;
			}
			if (err instanceof ApiError && err.status === 401) {
				setError('Your session expired. Please log in again.');
			} else if (
				err instanceof Error &&
				err.message.includes('Image upload failed')
			) {
				setError(err.message);
			} else {
				setError('Unable to save draft.');
			}
		} finally {
			if (isMountedRef.current) {
				setIsSaving(false);
			}
		}
	}, [videoDraft, isDraftSession, selectedImageId]);

	return {
		error,
		handleDiscardChanges,
		handleSaveDraft,
		isDraftSession,
		isLoading,
		isSaving,
	};
}
