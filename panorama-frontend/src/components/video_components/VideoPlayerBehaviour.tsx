import {
	memo,
	useCallback,
	useEffect,
	useState,
	useRef,
	type ReactNode,
} from 'react';
import { useTimer } from '../../hooks/video/useTimer';
import { DEFAULT_INACTIVITY_DELAY_MS } from '../../constants/ui';

type VideoPlayerBehaviourProps = {
	children: ReactNode;
	className?: string;
	inactivityDelayMs?: number;
	stickyVisible?: boolean;
	allowBackgroundPointerEvents?: boolean;
	hideGradient?: boolean;
};

function VideoPlayerBehaviour({
	children,
	className = '',
	inactivityDelayMs = DEFAULT_INACTIVITY_DELAY_MS,
	stickyVisible = false,
	allowBackgroundPointerEvents = false,
	hideGradient = false,
}: VideoPlayerBehaviourProps) {
	const [isManuallyVisible, setIsManuallyVisible] = useState(true);
	const isVisible = stickyVisible || isManuallyVisible;
	const timerActiveRef = useRef(false);

	const hideCallback = useCallback(() => {
		timerActiveRef.current = false;
		setIsManuallyVisible(false);
	}, []);

	const { schedule: scheduleHide, clear: clearHideTimer } = useTimer(
		hideCallback,
		inactivityDelayMs,
	);

	const showController = useCallback(() => {
		setIsManuallyVisible(true);
		if (!stickyVisible && !timerActiveRef.current) {
			timerActiveRef.current = true;
			scheduleHide();
		}
	}, [scheduleHide, stickyVisible]);

	function hideController(event: React.PointerEvent<HTMLDivElement>) {
		if (stickyVisible || event.pointerType === 'touch') {
			return;
		}

		clearHideTimer();
		timerActiveRef.current = false;
		setIsManuallyVisible(false);
	}

	useEffect(() => {
		if (stickyVisible) {
			clearHideTimer();
			timerActiveRef.current = false;
		}
	}, [stickyVisible, clearHideTimer]);

	return (
		<div
			className={`absolute inset-0 z-10 flex items-end ${className} ${isVisible && !hideGradient ? 'bg-linear-to-t from-black/50' : ''} ${allowBackgroundPointerEvents ? 'pointer-events-none' : ''}`}
			onPointerEnter={
				allowBackgroundPointerEvents ? undefined : showController
			}
			onPointerMove={
				allowBackgroundPointerEvents ? undefined : showController
			}
			onPointerLeave={
				allowBackgroundPointerEvents ? undefined : hideController
			}
			onPointerDown={
				allowBackgroundPointerEvents ? undefined : showController
			}
			onFocusCapture={
				allowBackgroundPointerEvents ? undefined : showController
			}
		>
			<div
				className={`w-full transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'pointer-events-none opacity-0'} ${allowBackgroundPointerEvents ? 'pointer-events-auto' : ''}`}
			>
				{children}
			</div>
		</div>
	);
}

export default memo(VideoPlayerBehaviour);
