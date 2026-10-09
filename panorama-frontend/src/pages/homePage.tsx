import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { VideoBlock } from '../components/video_components';
import { formatDurationMs, getRelativeTime } from '../utils/formatters/time';
import { getVideos } from '../api/videos';
import type { VideoListItem } from '../api/videos';
import Icon from '../components/Icon';
import {
	AdvancedFilterModal,
	FilterButtons,
	TrendingTags,
	type DetailedFilters,
} from '../components/homePage_components';
import { useAsyncResource } from '../hooks';

const PAGE_SIZE = 30;

const DEFAULT_DETAILED_FILTERS: DetailedFilters = {
	preferredTags: [],
	hiddenTags: [],
	timeRangeDays: null,
	minDurationMinutes: null,
	maxDurationMinutes: null,
};

function normalizeTagValue(tag: string) {
	return tag.trim().toLowerCase();
}

function HomePage() {
	const location = useLocation();
	const [page, setPage] = useState(1);
	const [selectedFilter, setSelectedFilter] = useState<
		'trending' | 'most-viewed' | 'top-rated' | 'newest' | null
	>('trending');
	const [detailedFilters, setDetailedFilters] = useState<DetailedFilters>(
		DEFAULT_DETAILED_FILTERS,
	);
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	const periodDays = 30;
	const searchTerm = useMemo(() => {
		const params = new URLSearchParams(location.search);
		return params.get('q')?.trim() ?? '';
	}, [location.search]);

	useEffect(() => {
		setPage(1);
	}, [searchTerm]);

	const activeDetailedFilterCount = useMemo(
		() =>
			detailedFilters.preferredTags.length +
			detailedFilters.hiddenTags.length +
			(detailedFilters.timeRangeDays == null ? 0 : 1) +
			(detailedFilters.minDurationMinutes == null ? 0 : 1) +
			(detailedFilters.maxDurationMinutes == null ? 0 : 1),
		[
			detailedFilters.hiddenTags.length,
			detailedFilters.maxDurationMinutes,
			detailedFilters.minDurationMinutes,
			detailedFilters.preferredTags.length,
			detailedFilters.timeRangeDays,
		],
	);

	const videoListFilters = useMemo(
		() => ({
			status: 'uploaded' as const,
			search: searchTerm || null,
			sort: selectedFilter,
			periodDays:
				selectedFilter === 'most-viewed' ||
				selectedFilter === 'trending'
					? periodDays
					: undefined,
			preferredTags: detailedFilters.preferredTags,
			hiddenTags: detailedFilters.hiddenTags,
			timeRangeDays: detailedFilters.timeRangeDays,
			minDurationMinutes: detailedFilters.minDurationMinutes,
			maxDurationMinutes: detailedFilters.maxDurationMinutes,
		}),
		[
			detailedFilters.hiddenTags,
			detailedFilters.maxDurationMinutes,
			detailedFilters.minDurationMinutes,
			detailedFilters.preferredTags,
			detailedFilters.timeRangeDays,
			periodDays,
			searchTerm,
			selectedFilter,
		],
	);

	const { data: pageResult, isLoading } = useAsyncResource(
		() => getVideos(page, PAGE_SIZE, videoListFilters),
		[page, videoListFilters],
	);
	const items: VideoListItem[] = pageResult?.items ?? [];
	const total = pageResult?.total ?? 0;

	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(total / PAGE_SIZE)),
		[total],
	);

	const handleFilterSelect = useCallback(
		(
			value:
				| 'trending'
				| 'most-viewed'
				| 'top-rated'
				| 'newest'
				| null
				| undefined,
		) => {
			if (value != null) {
				setSelectedFilter(value);
			}
			setPage(1);
		},
		[],
	);

	const handleTrendingTagToggle = useCallback((tag: string) => {
		const normalizedTag = normalizeTagValue(tag);
		if (!normalizedTag) {
			return;
		}

		setDetailedFilters((prev) => {
			if (prev.preferredTags.includes(normalizedTag)) {
				return {
					...prev,
					preferredTags: prev.preferredTags.filter(
						(item) => item !== normalizedTag,
					),
				};
			}

			return {
				...prev,
				preferredTags: [...prev.preferredTags, normalizedTag],
				hiddenTags: prev.hiddenTags.filter(
					(item) => item !== normalizedTag,
				),
			};
		});
		setPage(1);
	}, []);

	const openAdvancedFilters = useCallback(() => {
		setShowAdvancedFilters(true);
	}, []);

	const closeAdvancedFilters = useCallback(() => {
		setShowAdvancedFilters(false);
	}, []);

	const applyDetailedFilters = useCallback((next: DetailedFilters) => {
		setDetailedFilters(next);
		setPage(1);
	}, []);

	const resetDetailedFilters = useCallback(() => {
		setDetailedFilters(DEFAULT_DETAILED_FILTERS);
		setPage(1);
	}, []);

	return (
		<div className="container-main">
			<div className="flex flex-col p-2 gap-2">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={openAdvancedFilters}
						className={`btn btn-no-pad btn-filter h-12 aspect-square shrink-0 rounded-md border ${
							activeDetailedFilterCount > 0
								? 'border-primary text-primary'
								: 'border-overlay-light-20 text-text-primary'
						}`}
						aria-label="Open detailed filters"
						title="Detailed filters"
					>
						<Icon name="filter" />
					</button>
					<FilterButtons
						selected={selectedFilter}
						onSelect={handleFilterSelect}
					/>
				</div>
				<TrendingTags
					selectedTags={detailedFilters.preferredTags}
					onTagToggle={handleTrendingTagToggle}
				/>
			</div>
			<div className="flex flex-col gap-4">
				{searchTerm && (
					<div className="px-6 text-label-sm text-muted">
						Showing results for "{searchTerm}"
					</div>
				)}
				{isLoading ? (
					<div className="p-6 text-body">Loading videos...</div>
				) : items.length === 0 ? (
					<div className="p-6 text-body">
						No videos available.
					</div>
				) : (
					<>
						<div className="grid w-full gap-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
							{' '}
							{items.map((c) => (
								<VideoBlock
									key={c.id}
									title={c.title}
									author={c.author || null}
									timestamp={getRelativeTime(c.dayUploaded)}
									coverSrc={c.coverSrc}
									views={c.views}
									duration={formatDurationMs(c.totalDuration)}
								/>
							))}
						</div>

						<div className="flex items-center justify-center gap-4 mt-6">
							<button
								className="btn btn-secondary"
								onClick={() =>
									setPage((p) => Math.max(1, p - 1))
								}
								disabled={page <= 1}
							>
								Previous
							</button>
							<span className="text-body">
								Page {page} of {totalPages}
							</span>
							<button
								className="btn btn-secondary"
								onClick={() =>
									setPage((p) => Math.min(totalPages, p + 1))
								}
								disabled={page >= totalPages}
							>
								Next
							</button>
						</div>
					</>
				)}
			</div>
			<AdvancedFilterModal
				open={showAdvancedFilters}
				value={detailedFilters}
				onClose={closeAdvancedFilters}
				onApply={applyDetailedFilters}
				onReset={resetDetailedFilters}
			/>
		</div>
	);
}

export default HomePage;
