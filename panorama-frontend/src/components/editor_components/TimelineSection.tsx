import { memo } from 'react';
import Tabs, { type TabsOption } from '../ui/Tabs';
import type {
	VideoData,
	ImageItem,
	TextItem,
	TextStyle,
} from '../../types/video';
import GeneralSettingsPanel from './timeline_tabs/GeneralSettings';
import ImageTimeline from './timeline_tabs/image/ImageTimeline';
import TextTimeline from './timeline_tabs/text/TextTimeline';

export type TimelineTab = 'images' | 'text' | 'general';

const TIMELINE_TAB_OPTIONS: readonly TabsOption<TimelineTab>[] = [
	{ label: 'Images', value: 'images' },
	{ label: 'Text', value: 'text' },
	{ label: 'General', value: 'general' },
];

export type EditorTimelineSectionProps = {
	video: VideoData;
	activeTab: TimelineTab;
	onTabChange: (tab: TimelineTab) => void;
	selectedImageId: number | null;
	onImageSelect: (item: ImageItem) => void;
	onReorderImages: (nextImages: ImageItem[]) => void;
	onAddImage: (file: File) => void | Promise<void>;
	onAddSolidColor: (color: string) => void;
	onReorderTextItems: (nextTextItems: TextItem[]) => void;
	onAddTextItem: () => number;
	onDeleteTextItem: (textItemId: number) => void;
	onTextItemScalePreviewChange: (textItemId: number, scale: number) => void;
	onTextItemScaleChange: (textItemId: number, scale: number) => void;
	onTextItemStylePreviewChange: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
	onTextItemStyleChange: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
	onTextItemTimelinePatch: (
		textItemId: number,
		patch: Partial<Pick<TextItem, 'value' | 'startTime' | 'duration'>>,
	) => void;
	onTextItemSeek: (elapsedMs: number) => void;
	onTitleChange: (nextTitle: string) => void;
	onCoverUrlChange: (nextCoverUrl: string) => void;
	onDescriptionChange: (nextDescription: string) => void;
};

function EditorTimelineSection({
	video,
	activeTab,
	onTabChange,
	selectedImageId,
	onImageSelect,
	onReorderImages,
	onAddImage,
	onAddSolidColor,
	onReorderTextItems,
	onAddTextItem,
	onDeleteTextItem,
	onTextItemScalePreviewChange,
	onTextItemScaleChange,
	onTextItemStylePreviewChange,
	onTextItemStyleChange,
	onTextItemTimelinePatch,
	onTextItemSeek,
	onTitleChange,
	onCoverUrlChange,
	onDescriptionChange,
}: EditorTimelineSectionProps) {
	return (
		<div className="flex flex-col gap-2 px-4">
			<Tabs
				options={TIMELINE_TAB_OPTIONS}
				value={activeTab}
				onChange={onTabChange}
				ariaLabel="Timeline tabs"
				buttonClassName="h-10 px-4"
			/>
			{activeTab === 'images' && (
				<ImageTimeline
					imageItems={video.content?.images ?? []}
					selectedImageId={selectedImageId}
					onImageSelect={onImageSelect}
					onReorder={onReorderImages}
					onAddImage={onAddImage}
					onAddSolidColor={onAddSolidColor}
				/>
			)}
			{activeTab === 'text' && (
				<TextTimeline
					textItems={video.content.text ?? []}
					onReorder={onReorderTextItems}
					onAddTextItem={onAddTextItem}
					onDeleteTextItem={onDeleteTextItem}
					onScalePreviewChange={onTextItemScalePreviewChange}
					onScaleChange={onTextItemScaleChange}
					onStylePreviewChange={onTextItemStylePreviewChange}
					onStyleChange={onTextItemStyleChange}
					onTimelinePatch={onTextItemTimelinePatch}
					onSeek={onTextItemSeek}
				/>
			)}
			{activeTab === 'general' && (
				<GeneralSettingsPanel
					title={video.title}
					coverUrl={video.coverSrc}
					description={video.description}
					onTitleChange={onTitleChange}
					onCoverUrlChange={onCoverUrlChange}
					onDescriptionChange={onDescriptionChange}
				/>
			)}
		</div>
	);
}

export default memo(EditorTimelineSection);
