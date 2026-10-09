import { memo, useCallback, useMemo } from 'react';
import VideoText from './VideoText';
import VideoImage from './VideoImage';
import VideoControls from './VideoControls';
import { filterActiveItems } from '../../utils/filtering/active';
import type { VideoData, TextItem } from '../../types/video';
import { useVideoPlayback } from '../../hooks/video/useVideoPlayback';
import { useVideoFullscreen } from '../../hooks/video/useVideoFullscreen';
import { useStoredBoolean, useStoredVolume } from '../../hooks/useStoredValue';

const MUTED_STORAGE_KEY = 'video.muted';
const VOLUME_STORAGE_KEY = 'video.volume';

type Position = { left: number; top: number };
type IdHandler<TArg> = (textItemId: number, arg: TArg) => void;

type VideoTextHandlers = {
	onTextItemPositionPreviewChange?: IdHandler<Position>;
	onTextItemPositionChange?: IdHandler<Position>;
	onTextItemScalePreviewChange?: IdHandler<number>;
	onTextItemScaleChange?: IdHandler<number>;
	onTextItemWidthPreviewChange?: IdHandler<number>;
	onTextItemWidthChange?: IdHandler<number>;
};

type VideoSeekRequest = {
	requestId: number;
	elapsedMs: number;
};

type VideoProps = VideoTextHandlers & {
	data: VideoData;
	externalSeekRequest?: VideoSeekRequest | null;
	enableTextEditing?: boolean;
};

type VideoTextItemProps = VideoTextHandlers & {
	item: TextItem;
	elapsedMs: number;
	editable: boolean;
};

function bindIdHandler<TArg>(
	handler: IdHandler<TArg> | undefined,
	itemId: number,
): ((arg: TArg) => void) | undefined {
	if (!handler) return undefined;
	return (arg) => handler(itemId, arg);
}

const VideoTextItem = memo(function VideoTextItem({
	item,
	elapsedMs,
	editable,
	onTextItemPositionPreviewChange,
	onTextItemPositionChange,
	onTextItemScalePreviewChange,
	onTextItemScaleChange,
	onTextItemWidthPreviewChange,
	onTextItemWidthChange,
}: VideoTextItemProps) {
	const boundHandlers = useMemo(
		() => ({
			onPreviewPositionChange: bindIdHandler(
				onTextItemPositionPreviewChange,
				item.id,
			),
			onPositionChange: bindIdHandler(onTextItemPositionChange, item.id),
			onScalePreviewChange: bindIdHandler(
				onTextItemScalePreviewChange,
				item.id,
			),
			onScaleChange: bindIdHandler(onTextItemScaleChange, item.id),
			onWidthPreviewChange: bindIdHandler(
				onTextItemWidthPreviewChange,
				item.id,
			),
			onWidthChange: bindIdHandler(onTextItemWidthChange, item.id),
		}),
		[
			item.id,
			onTextItemPositionPreviewChange,
			onTextItemPositionChange,
			onTextItemScalePreviewChange,
			onTextItemScaleChange,
			onTextItemWidthPreviewChange,
			onTextItemWidthChange,
		],
	);

	return (
		<VideoText
			value={item.value}
			position={item.position}
			scale={item.scale}
			width={item.width}
			textStyle={item.style}
			animation={item.animation}
			elapsedMs={elapsedMs}
			startTime={item.startTime}
			editable={editable}
			{...boundHandlers}
		/>
	);
});

function Video({
	data,
	externalSeekRequest,
	enableTextEditing = false,
	onTextItemPositionPreviewChange,
	onTextItemPositionChange,
	onTextItemScalePreviewChange,
	onTextItemScaleChange,
	onTextItemWidthPreviewChange,
	onTextItemWidthChange,
}: VideoProps) {
	const totalDuration = data.totalDuration ?? 0;

	const {
		isRunning,
		elapsedMs,
		hasFinished,
		startPlayback,
		stopPlayback,
		seekPlayback,
	} = useVideoPlayback({ totalDuration, externalSeekRequest });

	const {
		containerRef,
		isFullscreen,
		isFullscreenSupported,
		toggleFullscreen,
	} = useVideoFullscreen();

	const [isMuted, setIsMuted] = useStoredBoolean(MUTED_STORAGE_KEY, false);
	const [volume, setVolume] = useStoredVolume(VOLUME_STORAGE_KEY, 80);

	const handleMuteToggle = useCallback(() => {
		setIsMuted((previous) => !previous);
	}, [setIsMuted]);

	const handleVolumeChange = useCallback(
		(nextVolume: number) => {
			const clamped = Math.max(0, Math.min(100, Math.floor(nextVolume)));
			setVolume(clamped);
			if (clamped > 0) setIsMuted(false);
		},
		[setIsMuted, setVolume],
	);

	const handleToggleFullscreen = useCallback(() => {
		void toggleFullscreen();
	}, [toggleFullscreen]);

	const activeItems = useMemo(
		() => filterActiveItems(data.content?.text, elapsedMs),
		[data.content?.text, elapsedMs],
	);
	const activeImages = useMemo(
		() => filterActiveItems(data.content?.images, elapsedMs),
		[data.content?.images, elapsedMs],
	);

	const textHandlers = useMemo<VideoTextHandlers>(
		() => ({
			onTextItemPositionPreviewChange,
			onTextItemPositionChange,
			onTextItemScalePreviewChange,
			onTextItemScaleChange,
			onTextItemWidthPreviewChange,
			onTextItemWidthChange,
		}),
		[
			onTextItemPositionPreviewChange,
			onTextItemPositionChange,
			onTextItemScalePreviewChange,
			onTextItemScaleChange,
			onTextItemWidthPreviewChange,
			onTextItemWidthChange,
		],
	);

	return (
		<div className="w-full max-h-overflow-hidden">
			<div
				id="videoContainer"
				ref={containerRef}
				onDoubleClick={handleToggleFullscreen}
				className={`relative overflow-hidden bg-bg-elevated ${isFullscreen ? 'h-full w-full aspect-auto' : 'aspect-video'}`}
			>
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="relative aspect-video w-full max-h-full shrink-0 overflow-hidden">
						{activeImages.map((item) => (
							<VideoImage
								key={item.id}
								src={item.src}
								color={item.color}
								position={item.position}
								scale={item.scale}
								animation={item.animation}
								elapsedMs={elapsedMs}
								startTime={item.startTime}
							/>
						))}
						<div className="absolute inset-0 flex items-center justify-center p-4">
							{activeItems.map((item) => (
								<VideoTextItem
									key={item.id}
									item={item}
									elapsedMs={elapsedMs}
									editable={enableTextEditing}
									{...textHandlers}
								/>
							))}
						</div>
					</div>
				</div>
				<VideoControls
					elapsedMs={elapsedMs}
					totalDuration={totalDuration}
					onSeek={seekPlayback}
					onDragStart={stopPlayback}
					isRunning={isRunning}
					onPlay={startPlayback}
					onPause={stopPlayback}
					isMuted={isMuted}
					volume={volume}
					onToggleMuted={handleMuteToggle}
					onVolumeChange={handleVolumeChange}
					hasFinished={hasFinished || enableTextEditing}
					isFullscreen={isFullscreen}
					isFullscreenSupported={isFullscreenSupported}
					onToggleFullscreen={toggleFullscreen}
					allowBackgroundPointerEvents={enableTextEditing}
				/>
			</div>
		</div>
	);
}

export default memo(Video);
