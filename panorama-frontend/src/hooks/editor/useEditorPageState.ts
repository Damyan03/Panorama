import { useCallback, useState } from 'react';
import { useEditorDraftSession } from './useEditorDraftSession';
import { useEditorGeneralState } from './useEditorGeneralState';
import { useEditorImageState } from './useEditorImageState';
import { useEditorTextState } from './useEditorTextState';
import type { VideoData } from '../../types/video';

export type EditorTab = 'settings' | 'animations';

export function useEditorPageState(slug: string | undefined) {
	const [videoDraft, setVideoDraft] = useState<VideoData | null>(
		null,
	);
	const [selectedImageId, setSelectedImageId] = useState<number | null>(null);
	const [imageSettingsTab, setImageSettingsTab] =
		useState<EditorTab>('settings');

	const draftSession = useEditorDraftSession({
		slug,
		videoDraft,
		selectedImageId,
		setVideoDraft,
		setSelectedImageId,
	});
	const imageState = useEditorImageState({
		videoDraft,
		setVideoDraft,
		selectedImageId,
		setSelectedImageId,
	});
	const textState = useEditorTextState({
		videoDraft,
		setVideoDraft,
	});
	const generalState = useEditorGeneralState({ setVideoDraft });

	const { handleDiscardChanges: discardSessionDraft } = draftSession;
	const { resetTextPreviewState } = textState;

	const handleDiscardChanges = useCallback(() => {
		resetTextPreviewState();
		discardSessionDraft();
	}, [discardSessionDraft, resetTextPreviewState]);

	return {
		videoDraft,
		videoPreviewDraft: textState.videoPreviewDraft,
		session: {
			error: draftSession.error,
			isDraftSession: draftSession.isDraftSession,
			isLoading: draftSession.isLoading,
			isSaving: draftSession.isSaving,
			save: draftSession.handleSaveDraft,
			discard: handleDiscardChanges,
		},
		imageSettingsTab: {
			value: imageSettingsTab,
			set: setImageSettingsTab,
		},
		images: {
			items: imageState.imageItems,
			selectedId: selectedImageId,
			selected: imageState.selectedImage,
			draftScale: imageState.draftScale,
			append: imageState.appendImageFromFile,
			appendSolidColor: imageState.appendSolidColorImage,
			reorder: imageState.handleReorderImages,
			select: imageState.handleTimelineImageSelect,
			commitDuration: imageState.handleSelectedImageDurationCommit,
			changePosition: imageState.handleSelectedImagePositionChange,
			changeScale: imageState.handleSelectedImageScaleChange,
			commitScale: imageState.handleSelectedImageScaleCommit,
		},
		text: {
			reorder: textState.handleReorderTextItems,
			append: textState.handleAppendTextItem,
			delete: textState.handleDeleteTextItem,
			previewPosition: textState.handlePreviewTextItemPosition,
			commitPosition: textState.handleUpdateTextItemPosition,
			previewScale: textState.handlePreviewTextItemScale,
			commitScale: textState.handleUpdateTextItemScale,
			previewStyle: textState.handlePreviewTextItemStyle,
			commitStyle: textState.handleUpdateTextItemStyle,
			previewWidth: textState.handlePreviewTextItemWidth,
			commitWidth: textState.handleUpdateTextItemWidth,
			patchTimeline: textState.handlePatchTextItemTimeline,
		},
		general: {
			setTitle: generalState.handleUpdateVideoTitle,
			setCoverUrl: generalState.handleUpdateVideoCoverUrl,
			setDescription: generalState.handleUpdateVideoDescription,
		},
	};
}

export default useEditorPageState;
