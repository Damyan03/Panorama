import { memo } from 'react';
import type { ImageItem } from '../../../../types/video';
import { EDITOR_MAX_SCALE } from '../../../../constants/ui';
import Tabs, { type TabsOption } from '../../../ui/Tabs';
import { DurationInput, SliderInput } from '../../../ui/inputs';
import EditorImagePreview from './ImagePreview';

type ImageSettingsTab = 'settings' | 'animations';

const IMAGE_SETTINGS_TAB_OPTIONS: readonly TabsOption<ImageSettingsTab>[] = [
	{ label: 'Settings', value: 'settings' },
	{ label: 'Animations', value: 'animations' },
];

type ImageSettingsProps = {
	selectedImage?: ImageItem | null;
	draftScale: number;
	onPositionChange: (position: { left: number; top: number }) => void;
	durationMs: number;
	onDurationCommitMs: (valueMs: number) => void;
	activeTab: ImageSettingsTab;
	onTabChange: (tab: ImageSettingsTab) => void;
	onScaleChange: (value: number) => void;
	onScaleCommit: () => void;
};

function ImageSettings({
	selectedImage,
	draftScale,
	onPositionChange,
	durationMs,
	onDurationCommitMs,
	activeTab,
	onTabChange,
	onScaleChange,
	onScaleCommit,
}: ImageSettingsProps) {
	return (
		<section className="card flex flex-col">
			<div className="flex w-full min-w-0 items-center gap-4">
				<div className="shrink-0">
					<EditorImagePreview
						image={selectedImage ?? undefined}
						scaleOverride={draftScale}
						onPositionChange={onPositionChange}
					/>
				</div>
				<div className="min-w-0 flex flex-1 flex-col gap-1">
					<span className="text-[11px] font-medium uppercase tracking-wide text-text-muted">
						Duration
					</span>
					<DurationInput
						valueMs={durationMs}
						onCommitMs={onDurationCommitMs}
						className="h-9 w-full"
					/>
				</div>
			</div>
			<div className="flex flex-col gap-4">
				<Tabs
					options={IMAGE_SETTINGS_TAB_OPTIONS}
					value={activeTab}
					onChange={onTabChange}
					ariaLabel="Editor configuration tabs"
					buttonClassName="h-10 px-4"
				/>
				{activeTab === 'settings' && (
					<div className="flex flex-col gap-1">
						<span className="text-xs text-text-muted">Scale</span>
						<SliderInput
							value={draftScale}
							onChange={onScaleChange}
							onCommit={onScaleCommit}
							max={EDITOR_MAX_SCALE}
						/>
					</div>
				)}
				{activeTab === 'animations' && (
					<div className="flex-center h-10 w-full text-label-md">
						Animation settings coming soon!
					</div>
				)}
			</div>
		</section>
	);
}

export type { ImageSettingsTab, ImageSettingsProps };
export default memo(ImageSettings);
