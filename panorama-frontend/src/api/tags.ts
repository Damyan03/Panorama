import { buildQueryString } from '../utils/url';
import { requestJson } from './client';

export interface TrendingTag {
	name: string;
	count: number;
}

export function getTrendingTags(
	period = 30,
	limit = 10,
): Promise<TrendingTag[]> {
	return requestJson<TrendingTag[]>(
		`/tags/trending${buildQueryString({ period, limit })}`,
	);
}
