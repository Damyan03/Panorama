import { memo } from 'react';
import useDesktopDragScroll from '../../hooks/useDesktopDragScroll';
import Tabs, { type TabsOption } from '../ui/Tabs';

type FilterValue = 'trending' | 'most-viewed' | 'top-rated' | 'newest';

const FILTER_OPTIONS: readonly TabsOption<FilterValue>[] = [
	{ label: 'Trending', value: 'trending' },
	{ label: 'Most Viewed', value: 'most-viewed' },
	{ label: 'Top Rated', value: 'top-rated' },
	{ label: 'Newest', value: 'newest' },
];

interface FilterButtonsProps {
	selected?: FilterValue | null;
	onSelect?: (value: FilterValue | null) => void;
}

const FilterButtons = memo(function FilterButtons({
	selected = 'trending',
	onSelect,
}: FilterButtonsProps) {
	const dragScrollHandlers = useDesktopDragScroll();

	return (
		<div
			className="flex overflow-x-auto flex-1 min-w-0 gap-2 p-1 cursor-grab active:cursor-grabbing"
			{...dragScrollHandlers}
		>
			<Tabs
				options={FILTER_OPTIONS}
				value={selected}
				onChange={onSelect}
				allowDeselect
				ariaLabel="Video sort filters"
				className="w-max"
				buttonClassName="btn-sm btn-filter"
			/>
		</div>
	);
});

export default FilterButtons;
