import type { AnimationConfig } from '../utils/animations/text';
import type { Position } from '../utils/formatters/position';
import type { NumericPosition } from '../utils/animations/image';
import type { Author } from './common';

export type TextHorizontalAlign = 'left' | 'center' | 'right';

export interface TextStyle {
	fontFamily?: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	lineThrough?: boolean;
	textAlign?: TextHorizontalAlign;
	letterSpacingPx?: number;
	lineHeight?: number;
	opacity?: number;
	color?: string;
	edgeEnabled?: boolean;
	edgeWidthPx?: number;
	edgeSmoothingPx?: number;
	edgeColor?: string;
	dropShadowEnabled?: boolean;
	dropShadowColor?: string;
	dropShadowBlurPx?: number;
	dropShadowOffsetXPx?: number;
	dropShadowOffsetYPx?: number;
}

export interface TextItem {
	id: number;
	startTime: number;
	endTime?: number;
	duration?: number;
	scale?: number;
	width?: number;
	position: Position;
	animation?: AnimationConfig[];
	value: string;
	style?: TextStyle;
}

export interface ImageItem {
	id: number;
	animationId?: string;
	startTime: number;
	endTime?: number;
	duration?: number;
	position: NumericPosition;
	scale: number;
	animation?: AnimationConfig[];
	src: string;
	color?: string;
	previewSrc?: string;
}

export interface VideoData {
	id: number;
	title: string;
	description: string;
	authorId: number;
	author: Author | null;
	tags: string[];
	dayUploaded: string;
	coverSrc: string;
	views: number;
	likes: number;
	likedByCurrentUser?: boolean;
	totalDuration: number;
	content: {
		text: TextItem[];
		images: ImageItem[];
	};
}
