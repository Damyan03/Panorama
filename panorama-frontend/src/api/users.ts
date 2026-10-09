import { requestJson } from './client';

export const FOLLOWING_UPDATED_EVENT = 'users:following-updated';

export interface PublicUserVideo {
	id: number;
	title: string;
	coverSrc: string;
	dayUploaded: string;
	views: number;
	likes: number;
	totalDuration: number;
}

export interface PublicUser {
	id: number;
	username: string;
	displayName: string;
	profilePicUrl: string;
	profileDescription: string;
	gender: string;
	labels: string[];
	age: number | null;
	nationality: string;
	role: string;
	joinedAt: string;
	videoCount: number;
	totalLikes: number;
	totalViews: number;
	followerCount: number;
	followingCount: number;
	isFollowedByCurrentUser: boolean;
	recentVideos: PublicUserVideo[];
}

export interface FollowState {
	isFollowing: boolean;
	followerCount: number;
	followingCount: number;
}

export interface FollowingUser {
	id: number;
	username: string;
	displayName: string;
	profilePicUrl: string;
	followedAt: string;
}

export interface UserSettings {
	id: number;
	username: string;
	email: string;
	displayName: string;
	profilePicUrl: string;
	profileDescription: string;
	gender: string;
	labels: string[];
	age: number | null;
	nationality: string;
	role: string;
	joinedAt: string;
}

export interface UpdateUserSettingsRequest {
	displayName?: string;
	username?: string;
	email?: string;
	profilePicUrl?: string;
	profileDescription?: string;
	gender?: string;
	labels?: string[];
	age?: number;
	nationality?: string;
}

export interface ChangePasswordRequest {
	currentPassword: string;
	newPassword: string;
}

export function getPublicUser(username: string) {
	return requestJson<PublicUser>(`/users/${encodeURIComponent(username)}`);
}

export function getMySettings() {
	return requestJson<UserSettings>('/users/me/settings');
}

export function getMyFollowing() {
	return requestJson<FollowingUser[]>('/users/me/following');
}

export function followUser(username: string) {
	return requestJson<FollowState>(
		`/users/${encodeURIComponent(username)}/follow`,
		{
			method: 'POST',
		},
	);
}

export function unfollowUser(username: string) {
	return requestJson<FollowState>(
		`/users/${encodeURIComponent(username)}/follow`,
		{
			method: 'DELETE',
		},
	);
}

export function notifyFollowingUpdated() {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new Event(FOLLOWING_UPDATED_EVENT));
	}
}

export function updateMySettings(request: UpdateUserSettingsRequest) {
	return requestJson<UserSettings>('/users/me/settings', {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request),
	});
}

export function changeMyPassword(request: ChangePasswordRequest) {
	return requestJson<void>('/users/me/password', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(request),
	});
}
