import { memo, useCallback } from 'react';
import ProgressBar from './ProgressBar';
import { formatTimeMs } from '../../utils/formatters/time';
import VideoPlayerBehaviour from './VideoPlayerBehaviour';
import { SliderInput } from '../ui/inputs';
import FullscreenIcon from '../../assets/fullscreen.svg?react';
import PauseIcon from '../../assets/pause.svg?react';
import PlayIcon from '../../assets/play.svg?react';
import VolumeMuteIcon from '../../assets/volumeMute.svg?react';
import VolumeOnIcon from '../../assets/volumeOn.svg?react';

type VideoControlsProps = {
	elapsedMs: number;
	totalDuration: number;
	onSeek: (nextElapsedMs: number) => void;
	onDragStart: () => void;
	isRunning: boolean;
	onPlay: () => void;
	onPause: () => void;
	isMuted: boolean;
	volume: number;
	onToggleMuted: () => void;
	onVolumeChange: (nextVolume: number) => void;
	hasFinished: boolean;
	isFullscreen: boolean;
	isFullscreenSupported: boolean;
	onToggleFullscreen: () => Promise<void>;
	allowBackgroundPointerEvents?: boolean;
};

type PlaybackToggleButtonProps = {
	isRunning: boolean;
	onPlay: () => void;
	onPause: () => void;
};

const PlaybackToggleButton = memo(function PlaybackToggleButton({
	isRunning,
	onPlay,
	onPause,
}: PlaybackToggleButtonProps) {
	return (
		<button
			type="button"
			onClick={isRunning ? onPause : onPlay}
			className={`btn btn-sm px-2.5 ${isRunning ? 'btn-secondary' : 'btn-primary'}`}
			aria-label={isRunning ? 'Pause video' : 'Play video'}
		>
			{isRunning ? (
				<PauseIcon aria-hidden="true" className="h-4 w-4" />
			) : (
				<PlayIcon aria-hidden="true" className="h-4 w-4" />
			)}
		</button>
	);
});

type MuteButtonProps = {
	isSilent: boolean;
	onToggleMuted: () => void;
};

const MuteButton = memo(function MuteButton({
	isSilent,
	onToggleMuted,
}: MuteButtonProps) {
	return (
		<button
			type="button"
			onClick={onToggleMuted}
			className={`btn btn-secondary btn-sm px-2.5 ${isSilent ? 'border-primary/30 bg-primary/20' : ''}`}
			aria-label={isSilent ? 'Unmute' : 'Mute'}
			title={isSilent ? 'Unmute' : 'Mute'}
			aria-pressed={isSilent}
		>
			{isSilent ? (
				<VolumeMuteIcon aria-hidden="true" className="h-4 w-4" />
			) : (
				<VolumeOnIcon aria-hidden="true" className="h-4 w-4" />
			)}
		</button>
	);
});

type FullscreenToggleButtonProps = {
	isFullscreen: boolean;
	onToggleFullscreen: () => Promise<void>;
};

const FullscreenToggleButton = memo(function FullscreenToggleButton({
	isFullscreen,
	onToggleFullscreen,
}: FullscreenToggleButtonProps) {
	const handleToggleFullscreen = useCallback(() => {
		void onToggleFullscreen();
	}, [onToggleFullscreen]);

	return (
		<button
			type="button"
			onClick={handleToggleFullscreen}
			className={`btn btn-secondary btn-sm px-2.5 ${isFullscreen ? 'border-primary/30 bg-primary/20' : ''}`}
			aria-label={
				isFullscreen ? 'Exit fullscreen mode' : 'Enter fullscreen mode'
			}
			aria-pressed={isFullscreen}
		>
			<FullscreenIcon aria-hidden="true" className="h-4 w-4" />
		</button>
	);
});

const VideoControls = memo(function VideoControls({
	elapsedMs,
	totalDuration,
	onSeek,
	onDragStart,
	isRunning,
	onPlay,
	onPause,
	isMuted,
	volume,
	onToggleMuted,
	onVolumeChange,
	hasFinished,
	isFullscreen,
	isFullscreenSupported,
	onToggleFullscreen,
	allowBackgroundPointerEvents = false,
}: VideoControlsProps) {
	const isSilent = isMuted || volume === 0;

	return (
		<VideoPlayerBehaviour
			className="px-4 py-3"
			stickyVisible={hasFinished}
			allowBackgroundPointerEvents={allowBackgroundPointerEvents}
			hideGradient={allowBackgroundPointerEvents}
		>
			<ProgressBar
				elapsedMs={elapsedMs}
				totalDuration={totalDuration}
				onSeek={onSeek}
				onDragStart={onDragStart}
			/>
			<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
				<div className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
					<PlaybackToggleButton
						isRunning={isRunning}
						onPlay={onPlay}
						onPause={onPause}
					/>
					<div className="tabular-nums whitespace-nowrap">
						{formatTimeMs(elapsedMs)} /{' '}
						{formatTimeMs(totalDuration)}
					</div>
				</div>
				<div className="flex min-w-0 flex-1 items-center justify-end gap-2">
					<MuteButton
						isSilent={isSilent}
						onToggleMuted={onToggleMuted}
					/>
					<SliderInput
						value={volume}
						min={0}
						max={100}
						step={1}
						hideNumber
						onChange={onVolumeChange}
						ariaLabel="Volume"
						className="w-24 min-w-20 sm:w-36 px-0 py-0"
					/>
					{isFullscreenSupported ? (
						<FullscreenToggleButton
							isFullscreen={isFullscreen}
							onToggleFullscreen={onToggleFullscreen}
						/>
					) : null}
				</div>
			</div>
		</VideoPlayerBehaviour>
	);
});

export default VideoControls;
