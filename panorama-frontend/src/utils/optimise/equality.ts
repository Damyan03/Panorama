export type EqualityComparator<T> = (left: T, right: T) => boolean;

type ArrayEqualityOptions = {
	treatUndefinedAsEmpty?: boolean;
};

const EMPTY_ARRAY: readonly unknown[] = Object.freeze([]);

function normalizeArray<T>(
	items: readonly T[] | undefined,
	treatUndefinedAsEmpty: boolean,
): readonly T[] | undefined {
	if (items !== undefined || !treatUndefinedAsEmpty) {
		return items;
	}

	return EMPTY_ARRAY as readonly T[];
}

export function areArraysEqual<T>(
	leftItems: readonly T[] | undefined,
	rightItems: readonly T[] | undefined,
	areItemsEqual: EqualityComparator<T>,
	options: ArrayEqualityOptions = {},
): boolean {
	const { treatUndefinedAsEmpty = false } = options;
	const left = normalizeArray(leftItems, treatUndefinedAsEmpty);
	const right = normalizeArray(rightItems, treatUndefinedAsEmpty);

	if (left === right) {
		return true;
	}

	if (!left || !right) {
		return false;
	}

	if (left.length !== right.length) {
		return false;
	}

	for (let index = 0; index < left.length; index += 1) {
		if (!areItemsEqual(left[index], right[index])) {
			return false;
		}
	}

	return true;
}

export function areShallowEqualByKeys<T extends object>(
	left: T,
	right: T,
	keys: readonly (keyof T)[],
): boolean {
	for (const key of keys) {
		if (!Object.is(left[key], right[key])) {
			return false;
		}
	}

	return true;
}

export function areStrictlyEqual<T>(left: T, right: T): boolean {
	return Object.is(left, right);
}
