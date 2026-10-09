import { ApiError, apiFetch, getApiBaseUrl, requestJson } from './client';

export interface UploadImageResponse {
	id: string;
	url: string;
	previewId: string;
	previewUrl: string;
	error?: string;
}

export async function uploadImage(file: File): Promise<UploadImageResponse> {
	const formData = new FormData();
	formData.append('file', file);

	const response = await apiFetch('/images/upload', {
		method: 'POST',
		body: formData,
	});

	const text = await response.text();
	if (!text) {
		throw new ApiError(response.status, 'Empty response from image upload');
	}
	return JSON.parse(text) as UploadImageResponse;
}

export async function deleteImage(imageId: string): Promise<void> {
	await requestJson<void>(`/images/${encodeURIComponent(imageId)}`, {
		method: 'DELETE',
	});
}

export function getImageUrl(imageId: string): string {
	return `${getApiBaseUrl()}/images/${encodeURIComponent(imageId)}`;
}
