import type { Location } from 'react-router-dom';

export type AuthRouteState = {
	from?: string;
	backgroundLocation?: Location;
};

export function locationToPath(
	location: Pick<Location, 'pathname' | 'search' | 'hash'>,
) {
	return `${location.pathname}${location.search}${location.hash}`;
}

export function createAuthRouteState(location: Location): AuthRouteState {
	return {
		from: locationToPath(location),
		backgroundLocation: location,
	};
}

export function getReturnToPath(state: unknown, fallback = '/') {
	if (
		state &&
		typeof state === 'object' &&
		'backgroundLocation' in state &&
		(state as AuthRouteState).backgroundLocation
	) {
		return locationToPath(
			(state as AuthRouteState).backgroundLocation as Location,
		);
	}

	if (
		state &&
		typeof state === 'object' &&
		'from' in state &&
		typeof (state as AuthRouteState).from === 'string'
	) {
		return (state as AuthRouteState).from as string;
	}

	return fallback;
}
