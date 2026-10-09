import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Video } from '../components/video_components';
import {
	EditorTimelineSection,
	ImageSettings,
	type TimelineTab,
} from '../components/editor_components';
import { useEditorPageState, useTextSeek } from '../hooks/editor';

function EditorPage() {
	const { slug } = useParams();
	const [timelineTab, setTimelineTab] = useState<TimelineTab>('images');
	const { textSeekRequest, handleTextItemSeek } = useTextSeek();

	const {
		videoDraft,
		videoPreviewDraft,
		session,
		imageSettingsTab,
		images,
		text,
		general,
	} = useEditorPageState(slug);

	if (session.isLoading) {
		return (
			<div className="flex-center w-full p-6 text-muted">
				Loading video draft...
			</div>
		);
	}

	if (!videoDraft) {
		return (
			<div className="flex-center w-full p-6 text-muted">
				No video draft available.
			</div>
		);
	}

	return (
		<div
			className="flex h-full min-h-0 w-full flex-col gap-4 overflow-y-auto overscroll-y-contain scrollbar-thin-vertical"
			style={{ overflowAnchor: 'none' }}
		>
			<Video
				data={videoPreviewDraft ?? videoDraft}
				externalSeekRequest={textSeekRequest}
				enableTextEditing
				onTextItemPositionPreviewChange={text.previewPosition}
				onTextItemPositionChange={text.commitPosition}
				onTextItemScalePreviewChange={text.previewScale}
				onTextItemScaleChange={text.commitScale}
				onTextItemWidthPreviewChange={text.previewWidth}
				onTextItemWidthChange={text.commitWidth}
			/>
			{session.error && (
				<div className="badge badge-error w-full justify-start">
					{session.error}
				</div>
			)}
			<EditorTimelineSection
				video={videoDraft}
				activeTab={timelineTab}
				onTabChange={setTimelineTab}
				selectedImageId={images.selectedId}
				onImageSelect={images.select}
				onReorderImages={images.reorder}
				onAddImage={images.append}
				onAddSolidColor={images.appendSolidColor}
				onReorderTextItems={text.reorder}
				onAddTextItem={text.append}
				onDeleteTextItem={text.delete}
				onTextItemScalePreviewChange={text.previewScale}
				onTextItemScaleChange={text.commitScale}
				onTextItemStylePreviewChange={text.previewStyle}
				onTextItemStyleChange={text.commitStyle}
				onTextItemTimelinePatch={text.patchTimeline}
				onTextItemSeek={handleTextItemSeek}
				onTitleChange={general.setTitle}
				onCoverUrlChange={general.setCoverUrl}
				onDescriptionChange={general.setDescription}
			/>
			{timelineTab === 'images' && (
				<ImageSettings
					selectedImage={images.selected}
					draftScale={images.draftScale}
					onPositionChange={images.changePosition}
					durationMs={images.selected?.duration ?? 0}
					onDurationCommitMs={images.commitDuration}
					activeTab={imageSettingsTab.value}
					onTabChange={imageSettingsTab.set}
					onScaleChange={images.changeScale}
					onScaleCommit={images.commitScale}
				/>
			)}
			<div className="flex w-full flex-col gap-2">
				<div className="flex w-full gap-2">
					<button
						type="button"
						onClick={session.discard}
						disabled={
							session.isSaving ||
							session.isLoading ||
							!videoDraft ||
							!session.isDraftSession
						}
						className="btn btn-danger flex-1 justify-center"
					>
						Discard changes
					</button>
					<button
						type="button"
						onClick={() => void session.save()}
						disabled={
							session.isSaving ||
							session.isLoading ||
							!videoDraft ||
							!session.isDraftSession
						}
						className="btn btn-success flex-1 justify-center"
					>
						{session.isSaving ? 'Saving...' : 'Save Draft'}
					</button>
				</div>
				<div className="flex-center">
					<button
						type="button"
						className="btn btn-primary w-1/2 justify-center"
					>
						Upload
					</button>
				</div>
			</div>
		</div>
	);
}

export default EditorPage;
