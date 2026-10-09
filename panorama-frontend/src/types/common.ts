export interface Author {
	username?: string;
	displayName?: string;
	profilePicUrl?: string;
}

export interface PagedResult<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
}
