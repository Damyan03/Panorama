import { forwardRef, memo, type ComponentPropsWithoutRef } from 'react';
import SearchIcon from '../assets/search.svg?react';
import UserIcon from '../assets/user.svg?react';
import ShareIcon from '../assets/share.svg?react';
import ReportIcon from '../assets/report.svg?react';
import FavouriteIcon from '../assets/favourite.svg?react';
import EditIcon from '../assets/edit.svg?react';
import DeleteIcon from '../assets/delete.svg?react';
import PlusIcon from '../assets/plus.svg?react';
import FilterIcon from '../assets/filter.svg?react';
import DotsVerticalIcon from '../assets/dotsVertical.svg?react';
import ChevronDownIcon from '../assets/chevronDown.svg?react';
import EyedropperIcon from '../assets/eyedropper.svg?react';
import CloseIcon from '../assets/close.svg?react';
import MenuIcon from '../assets/menu.svg?react';
import XTwitterIcon from '../assets/xTwitter.svg?react';
import RedditIcon from '../assets/reddit.svg?react';
import DiscordIcon from '../assets/discord.svg?react';
import BoldIcon from '../assets/bold.svg?react';
import ItalicIcon from '../assets/italic.svg?react';
import UnderlineIcon from '../assets/underline.svg?react';
import StrikeIcon from '../assets/strike.svg?react';
import LeftAlignIcon from '../assets/leftAlign.svg?react';
import CenterAlignIcon from '../assets/centerAlign.svg?react';
import RightAlignIcon from '../assets/rightAlign.svg?react';

const icons = {
	search: SearchIcon,
	user: UserIcon,
	share: ShareIcon,
	report: ReportIcon,
	favourite: FavouriteIcon,
	edit: EditIcon,
	delete: DeleteIcon,
	plus: PlusIcon,
	filter: FilterIcon,
	dotsVertical: DotsVerticalIcon,
	chevronDown: ChevronDownIcon,
	eyedropper: EyedropperIcon,
	close: CloseIcon,
	menu: MenuIcon,
	xTwitter: XTwitterIcon,
	reddit: RedditIcon,
	discord: DiscordIcon,
	bold: BoldIcon,
	italic: ItalicIcon,
	underline: UnderlineIcon,
	strike: StrikeIcon,
	leftAlign: LeftAlignIcon,
	centerAlign: CenterAlignIcon,
	rightAlign: RightAlignIcon,
} as const;

export type IconName = keyof typeof icons;

type IconProps = {
	name: IconName;
	title?: string;
} & Omit<ComponentPropsWithoutRef<'svg'>, 'children'>;

const IconBase = forwardRef<SVGSVGElement, IconProps>(function Icon(
	{ name, title, className, ...svgProps },
	ref,
) {
	const SvgIcon = icons[name];

	return (
		<SvgIcon
			ref={ref}
			role={title ? 'img' : undefined}
			aria-label={title}
			aria-hidden={title ? undefined : true}
			focusable="false"
			className={`w-full h-full ${className ?? ''}`}
			{...svgProps}
		/>
	);
});

const Icon = memo(IconBase);
Icon.displayName = 'Icon';

export default Icon;
