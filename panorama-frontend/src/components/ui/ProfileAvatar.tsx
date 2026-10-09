import { useState } from 'react';

type Props = {
	src?: string;
	alt: string;
	initial: string;
	size?: 'sm' | 'md';
	className?: string;
};

/**
 * Reusable profile avatar component with image and initial fallback.
 * Handles image loading errors gracefully.
 */
export default function ProfileAvatar({
	src,
	alt,
	initial,
	size = 'md',
	className = '',
}: Props) {
	const [imageError, setImageError] = useState(false);
	const showImage = src && !imageError;

	const sizeClasses = {
		sm: 'h-10 w-10 text-sm',
		md: 'h-full aspect-square text-sm',
	};

	return (
		<div
			className={`flex-center overflow-hidden rounded-full border border-primary/30 bg-primary/20 font-semibold text-text-primary ${sizeClasses[size]} ${className}`}
			title={alt}
			aria-label={alt}
		>
			{showImage ? (
				<img
					src={src}
					alt={alt}
					onError={() => setImageError(true)}
					className="h-full w-full object-cover"
				/>
			) : (
				initial
			)}
		</div>
	);
}
