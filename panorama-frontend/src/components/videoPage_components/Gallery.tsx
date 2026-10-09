import { memo, useCallback, useEffect, useState } from 'react';
import type { VideoData } from '../../types/video';
import useDesktopDragScroll from '../../hooks/useDesktopDragScroll';

const Gallery = memo(
	function Gallery({
		images,
	}: {
		images: VideoData['content']['images'];
	}) {
		const dragScrollHandlers = useDesktopDragScroll();
		const [activeImage, setActiveImage] = useState<
			VideoData['content']['images'][number] | null
		>(null);

		const closeFullscreen = useCallback(() => {
			setActiveImage(null);
		}, []);

		useEffect(() => {
			if (!activeImage) {
				return;
			}

			const handleKeyDown = (event: KeyboardEvent) => {
				if (event.key === 'Escape') {
					closeFullscreen();
				}
			};

			window.addEventListener('keydown', handleKeyDown);

			return () => window.removeEventListener('keydown', handleKeyDown);
		}, [activeImage, closeFullscreen]);

		return (
			<div className="flex w-full flex-col gap-3">
				<h2 className="text-heading-sm">Gallery</h2>
				<div
					className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin-white cursor-grab active:cursor-grabbing"
					{...dragScrollHandlers}
				>
					{images.map((image) => (
						<button
							key={image.id}
							type="button"
							onClick={() => setActiveImage(image)}
							className="shrink-0 w-24 rounded-2xl cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-focus-ring"
							aria-label={`Open video image ${image.id} in fullscreen`}
						>
							<div className="aspect-square w-full overflow-hidden rounded-2xl border-2 border-border">
								{image.src === 'color' ? (
									<div
										className="pointer-events-none h-full w-full"
										style={{ backgroundColor: image.color }}
									/>
								) : image.src ? (
									<img
										src={image.src}
										alt={`Video image ${image.id}`}
										draggable={false}
										onDragStart={(event) =>
											event.preventDefault()
										}
										className="pointer-events-none h-full w-full select-none object-cover"
									/>
								) : (
									<div className="pointer-events-none h-full w-full bg-bg-elevated" />
								)}
							</div>
						</button>
					))}
				</div>
				{activeImage ? (
					<div className="overlay-modal" onClick={closeFullscreen}>
						<div className="absolute right-4 top-4 text-2xl font-medium text-text-secondary">
							X
						</div>
						{activeImage.src === 'color' ? (
							<div
								className="h-[50vh] w-[50vw] shadow-2xl"
								style={{ backgroundColor: activeImage.color }}
								onClick={(event) => event.stopPropagation()}
							/>
						) : activeImage.src ? (
							<img
								src={activeImage.src}
								alt={`Video image ${activeImage.id} fullscreen`}
								className="max-h-[92vh] max-w-[92vw] object-contain shadow-2xl"
								onClick={(event) => event.stopPropagation()}
							/>
						) : null}
					</div>
				) : null}
			</div>
		);
	},
	(prevProps, nextProps) => prevProps.images === nextProps.images,
);

export default Gallery;
