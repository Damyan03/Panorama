interface ImageResizeOptions {
	maxDimension?: number;
	quality?: number;
}

function getResizedDimensions(
	width: number,
	height: number,
	maxDimension?: number,
) {
	if (!maxDimension || maxDimension <= 0) {
		return { width, height };
	}

	const longestSide = Math.max(width, height);
	if (longestSide <= maxDimension) {
		return { width, height };
	}

	const scale = maxDimension / longestSide;
	return {
		width: Math.max(1, Math.round(width * scale)),
		height: Math.max(1, Math.round(height * scale)),
	};
}

async function blobToWebpBlob(source: Blob, options: ImageResizeOptions = {}) {
	const shouldResize =
		typeof options.maxDimension === 'number' && options.maxDimension > 0;

	if (!shouldResize && source.type === 'image/webp') {
		return source;
	}

	const bitmap = await createImageBitmap(source);
	try {
		const dimensions = getResizedDimensions(
			bitmap.width,
			bitmap.height,
			options.maxDimension,
		);
		const canvas = document.createElement('canvas');
		canvas.width = dimensions.width;
		canvas.height = dimensions.height;

		const context = canvas.getContext('2d');
		if (!context) {
			throw new Error('Unable to process image.');
		}

		context.imageSmoothingEnabled = true;
		context.imageSmoothingQuality = 'high';
		context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) => {
					if (result) {
						resolve(result);
						return;
					}

					reject(new Error('Unable to process image.'));
				},
				'image/webp',
				options.quality ?? 0.8,
			);
		});
	} finally {
		bitmap.close();
	}
}

export async function convertImageFileToWebp(
	file: File,
	options?: ImageResizeOptions,
): Promise<File> {
	const blob = await blobToWebpBlob(file, options);
	return new File([blob], 'image.webp', { type: 'image/webp' });
}
