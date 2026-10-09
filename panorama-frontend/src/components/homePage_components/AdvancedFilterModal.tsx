import { useCallback, useEffect, useMemo, useState } from 'react';
import { getTrendingTags } from '../../api/tags';
import Modal from '../ui/Modal';
import DualRangeSlider from '../ui/inputs/DualRangeSlider';
import { SelectInput } from '../ui/inputs';

export type DetailedFilters = {
	preferredTags: string[];
	hiddenTags: string[];
	timeRangeDays: number | null;
	minDurationMinutes: number | null;
	maxDurationMinutes: number | null;
};

type AdvancedFilterModalProps = {
	open: boolean;
	value: DetailedFilters;
	onClose: () => void;
	onApply: (next: DetailedFilters) => void;
	onReset: () => void;
};

const TIME_RANGE_OPTIONS: Array<{ label: string; value: number | null }> = [
	{ label: 'Any time', value: null },
	{ label: 'Past 24 hours', value: 1 },
	{ label: 'Past 7 days', value: 7 },
	{ label: 'Past 30 days', value: 30 },
	{ label: 'Past year', value: 365 },
];

const MAX_DURATION_MINUTES = 180;
const DRAFT_STORAGE_KEY = 'unnamed-site.home.advanced-filters-draft';

const DEFAULT_DRAFT_FILTERS: DetailedFilters = {
	preferredTags: [],
	hiddenTags: [],
	timeRangeDays: null,
	minDurationMinutes: null,
	maxDurationMinutes: null,
};

type TagBucket = 'positive' | 'negative' | null;

function toUniqueNormalizedTags(tags: string[]) {
	return tags
		.map((tag) => tag.trim().toLowerCase())
		.filter(Boolean)
		.filter((tag, index, all) => all.indexOf(tag) === index);
}

function getTagChipClasses(bucket: 'positive' | 'negative') {
	if (bucket === 'negative') {
		return 'max-w-full wrap-break-word px-2 rounded border border-error/50 text-error bg-error/10';
	}
	return 'max-w-full wrap-break-word px-2 rounded border border-accent-500 text-accent-500 bg-success/10';
}

function readDraftFilters(fallback: DetailedFilters) {
	if (typeof window === 'undefined') {
		return fallback;
	}

	try {
		const storedValue = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
		if (!storedValue) {
			return fallback;
		}

		const parsedValue = JSON.parse(storedValue) as Partial<DetailedFilters>;
		return {
			// Keep tags sourced from parent state so TrendingTags and advanced
			// filters always mirror each other.
			preferredTags: fallback.preferredTags,
			hiddenTags: fallback.hiddenTags,
			timeRangeDays:
				typeof parsedValue.timeRangeDays === 'number'
					? parsedValue.timeRangeDays
					: fallback.timeRangeDays,
			minDurationMinutes:
				typeof parsedValue.minDurationMinutes === 'number'
					? parsedValue.minDurationMinutes
					: fallback.minDurationMinutes,
			maxDurationMinutes:
				typeof parsedValue.maxDurationMinutes === 'number'
					? parsedValue.maxDurationMinutes
					: fallback.maxDurationMinutes,
		};
	} catch {
		return fallback;
	}
}

function writeDraftFilters(filters: DetailedFilters) {
	if (typeof window === 'undefined') {
		return;
	}

	window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(filters));
}

function clearDraftFilters() {
	if (typeof window === 'undefined') {
		return;
	}

	window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
}

export default function AdvancedFilterModal({
	open,
	value,
	onClose,
	onApply,
	onReset,
}: AdvancedFilterModalProps) {
	const [preferredTags, setPreferredTags] = useState<string[]>([]);
	const [hiddenTags, setHiddenTags] = useState<string[]>([]);
	const [timeRangeDays, setTimeRangeDays] = useState<number | null>(null);
	const [minDurationMinutes, setMinDurationMinutes] = useState(0);
	const [maxDurationMinutes, setMaxDurationMinutes] =
		useState(MAX_DURATION_MINUTES);
	const timeRangeSelectOptions = useMemo(() => {
		return TIME_RANGE_OPTIONS.map((option) => ({
			label: option.label,
			value: option.value == null ? 'any' : String(option.value),
		}));
	}, []);
	const handleTimeRangeChange = useCallback((nextValue: string) => {
		setTimeRangeDays(nextValue === 'any' ? null : Number(nextValue));
	}, []);
	const [trendingTags, setTrendingTags] = useState<string[]>([]);
	const [isLoadingTags, setIsLoadingTags] = useState(false);
	const [pickerMode, setPickerMode] = useState<TagBucket>(null);

	useEffect(() => {
		if (!open) return;
		const nextValue = readDraftFilters(value ?? DEFAULT_DRAFT_FILTERS);
		const nextMin = Math.max(0, nextValue.minDurationMinutes ?? 0);
		const nextMax = Math.min(
			MAX_DURATION_MINUTES,
			nextValue.maxDurationMinutes ?? MAX_DURATION_MINUTES,
		);
		setPreferredTags(toUniqueNormalizedTags(nextValue.preferredTags));
		setHiddenTags(toUniqueNormalizedTags(nextValue.hiddenTags));
		setTimeRangeDays(nextValue.timeRangeDays);
		setMinDurationMinutes(Math.min(nextMin, nextMax));
		setMaxDurationMinutes(Math.max(nextMax, nextMin));
		setPickerMode(null);
	}, [
		open,
		value.preferredTags,
		value.hiddenTags,
		value.timeRangeDays,
		value.minDurationMinutes,
		value.maxDurationMinutes,
	]);

	useEffect(() => {
		if (!open) return;

		writeDraftFilters({
			preferredTags,
			hiddenTags,
			timeRangeDays,
			minDurationMinutes:
				minDurationMinutes <= 0 ? null : minDurationMinutes,
			maxDurationMinutes:
				maxDurationMinutes >= MAX_DURATION_MINUTES
					? null
					: maxDurationMinutes,
		});
	}, [
		open,
		preferredTags,
		hiddenTags,
		timeRangeDays,
		minDurationMinutes,
		maxDurationMinutes,
	]);

	useEffect(() => {
		if (!open) return;
		let active = true;
		setIsLoadingTags(true);

		void getTrendingTags(3650, 200)
			.then((result) => {
				if (!active) return;
				setTrendingTags(
					toUniqueNormalizedTags(
						(result ?? []).map((tag) => tag.name),
					),
				);
			})
			.catch(() => {
				if (!active) return;
				setTrendingTags([]);
			})
			.finally(() => {
				if (!active) return;
				setIsLoadingTags(false);
			});

		return () => {
			active = false;
		};
	}, [open]);

	const allTags = useMemo(
		() =>
			toUniqueNormalizedTags([
				...trendingTags,
				...preferredTags,
				...hiddenTags,
			]),
		[trendingTags, preferredTags, hiddenTags],
	);

	const sortedTags = useMemo(
		() => [...allTags].sort((a, b) => a.localeCompare(b)),
		[allTags],
	);

	function removeTag(tag: string, bucket: 'positive' | 'negative') {
		if (bucket === 'positive') {
			setPreferredTags((prev) => prev.filter((item) => item !== tag));
			return;
		}
		setHiddenTags((prev) => prev.filter((item) => item !== tag));
	}

	function selectTag(tag: string) {
		if (!pickerMode) return;
		if (pickerMode === 'positive') {
			setPreferredTags((prev) =>
				prev.includes(tag) ? prev : [...prev, tag],
			);
			setHiddenTags((prev) => prev.filter((item) => item !== tag));
			return;
		}
		setHiddenTags((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
		setPreferredTags((prev) => prev.filter((item) => item !== tag));
	}

	function getTagBucket(tag: string): TagBucket {
		if (preferredTags.includes(tag)) return 'positive';
		if (hiddenTags.includes(tag)) return 'negative';
		return null;
	}

	function onChangeMinDuration(nextValue: number) {
		setMinDurationMinutes(Math.min(nextValue, maxDurationMinutes));
	}

	function onChangeMaxDuration(nextValue: number) {
		setMaxDurationMinutes(Math.max(nextValue, minDurationMinutes));
	}

	function applyFilters() {
		onApply({
			preferredTags,
			hiddenTags,
			timeRangeDays,
			minDurationMinutes:
				minDurationMinutes <= 0 ? null : minDurationMinutes,
			maxDurationMinutes:
				maxDurationMinutes >= MAX_DURATION_MINUTES
					? null
					: maxDurationMinutes,
		});
		onClose();
	}

	function handleReset() {
		clearDraftFilters();
		setPreferredTags(DEFAULT_DRAFT_FILTERS.preferredTags);
		setHiddenTags(DEFAULT_DRAFT_FILTERS.hiddenTags);
		setTimeRangeDays(DEFAULT_DRAFT_FILTERS.timeRangeDays);
		setMinDurationMinutes(0);
		setMaxDurationMinutes(MAX_DURATION_MINUTES);
		setPickerMode(null);
		onReset();
	}

	return (
		<Modal
			open={open}
			onClose={onClose}
			title="Detailed filters"
			description="Refine feed results by tags, upload time, and video length."
		>
			<div className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<label className="text-label-sm text-muted">
							Preferred tags
						</label>
						<button
							type="button"
							onClick={() => setPickerMode('positive')}
							className="btn btn-ghost btn-sm"
						>
							Add tag
						</button>
					</div>
					<div className="flex flex-wrap gap-2">
						{preferredTags.length === 0 ? (
							<span className="text-xs text-muted">
								No preferred tags selected.
							</span>
						) : (
							preferredTags.map((tag) => (
								<button
									key={`preferred-${tag}`}
									type="button"
									onClick={() => removeTag(tag, 'positive')}
									className={getTagChipClasses('positive')}
								>
									{tag}
								</button>
							))
						)}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-2">
						<label className="text-label-sm text-muted">
							Hidden tags
						</label>
						<button
							type="button"
							onClick={() => setPickerMode('negative')}
							className="btn btn-ghost btn-sm"
						>
							Add tag
						</button>
					</div>
					<div className="flex flex-wrap gap-2">
						{hiddenTags.length === 0 ? (
							<span className="text-xs text-muted">
								No hidden tags selected.
							</span>
						) : (
							hiddenTags.map((tag) => (
								<button
									key={`hidden-${tag}`}
									type="button"
									onClick={() => removeTag(tag, 'negative')}
									className={getTagChipClasses('negative')}
								>
									{tag}
								</button>
							))
						)}
					</div>
				</div>

				{pickerMode && (
					<div className="flex flex-col gap-2 rounded border border-overlay-light-20 p-3">
						<div className="flex items-center justify-between gap-2">
							<span className="text-label-sm text-muted">
								{pickerMode === 'positive'
									? 'Add preferred tag'
									: 'Add hidden tag'}
							</span>
							<button
								type="button"
								onClick={() => setPickerMode(null)}
								className="btn btn-ghost btn-sm"
							>
								Close
							</button>
						</div>
						{isLoadingTags ? (
							<div className="text-xs text-muted">
								Loading tags...
							</div>
						) : sortedTags.length === 0 ? (
							<div className="text-xs text-muted">
								No tags found.
							</div>
						) : (
							<div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
								{sortedTags.map((tag) => {
									const bucket = getTagBucket(tag);
									return (
										<button
											key={`pick-${tag}`}
											type="button"
											onClick={() => selectTag(tag)}
											className={
												bucket === 'negative'
													? getTagChipClasses(
															'negative',
														)
													: bucket === 'positive'
														? getTagChipClasses(
																'positive',
															)
														: 'text-text-secondary px-2 rounded border border-overlay-light-30'
											}
										>
											{tag}
										</button>
									);
								})}
							</div>
						)}
					</div>
				)}

				<div className="flex flex-col gap-2">
					<label className="text-label-sm text-muted">
						Upload time range
					</label>
					<SelectInput
						value={
							timeRangeDays == null
								? 'any'
								: String(timeRangeDays)
						}
						options={timeRangeSelectOptions}
						onChangeValue={handleTimeRangeChange}
						aria-label="Upload time range"
					/>
				</div>

				<div className="flex flex-col gap-2">
					<label className="text-label-sm text-muted">
						Video length range
					</label>
					<div className="mb-2 text-body">
						{minDurationMinutes}m -{' '}
						{maxDurationMinutes >= MAX_DURATION_MINUTES
							? `${MAX_DURATION_MINUTES}m+`
							: `${maxDurationMinutes}m`}
					</div>
					<DualRangeSlider
						min={0}
						max={MAX_DURATION_MINUTES}
						step={1}
						lowerValue={minDurationMinutes}
						upperValue={maxDurationMinutes}
						onLowerChange={onChangeMinDuration}
						onUpperChange={onChangeMaxDuration}
						lowerLabel="0m"
						upperLabel={`${MAX_DURATION_MINUTES}m+`}
					/>
				</div>

				<div className="mt-2 flex flex-wrap justify-end gap-2">
					<button
						type="button"
						onClick={handleReset}
						className="btn btn-ghost"
					>
						Reset
					</button>
					<button
						type="button"
						onClick={applyFilters}
						className="btn btn-primary"
					>
						Apply filters
					</button>
				</div>
			</div>
		</Modal>
	);
}
