import {
	createContext,
	createElement,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	type ReactNode,
} from 'react';
import type { TextStyle } from '../../../types/video';
import { areReadonlyStringArraysEqual } from '../../../utils/editor/textOptimise';

export type PatchTextStyleHandler = (stylePatch: Partial<TextStyle>) => void;
type StylePatchMode = 'preview' | 'commit';

type TextStylePanelFieldContextValue = {
	canEditStyle: boolean;
	patchTextStyle: PatchTextStyleHandler;
	previewPatchTextStyle: PatchTextStyleHandler;
};

const TextStylePanelFieldContext =
	createContext<TextStylePanelFieldContextValue | null>(null);

type TextStylePanelFieldProviderProps = {
	canEditStyle: boolean;
	patchTextStyle: PatchTextStyleHandler;
	previewPatchTextStyle?: PatchTextStyleHandler;
	children: ReactNode;
};

export function TextStylePanelFieldProvider({
	canEditStyle,
	patchTextStyle,
	previewPatchTextStyle,
	children,
}: TextStylePanelFieldProviderProps) {
	const previewPatch = previewPatchTextStyle ?? patchTextStyle;

	const value = useMemo(() => {
		return {
			canEditStyle,
			patchTextStyle,
			previewPatchTextStyle: previewPatch,
		};
	}, [canEditStyle, patchTextStyle, previewPatch]);

	return createElement(
		TextStylePanelFieldContext.Provider,
		{ value },
		children,
	);
}

export function useTextStylePanelFieldContext() {
	const context = useContext(TextStylePanelFieldContext);

	if (!context) {
		throw new Error(
			'Text style panel fields must be used within TextStylePanelFieldProvider.',
		);
	}

	return context;
}

export function useStylePatchHandler<Key extends keyof TextStyle>(
	styleKey: Key,
	mode: StylePatchMode = 'commit',
) {
	const { patchTextStyle, previewPatchTextStyle } =
		useTextStylePanelFieldContext();
	const stylePatchHandler =
		mode === 'preview' ? previewPatchTextStyle : patchTextStyle;

	return useCallback(
		(nextValue: TextStyle[Key]) => {
			stylePatchHandler({
				[styleKey]: nextValue,
			} as Pick<TextStyle, Key>);
		},
		[stylePatchHandler, styleKey],
	);
}

export function useStableReadonlyStringArray(values: readonly string[]) {
	const stableValuesRef = useRef(values);

	if (!areReadonlyStringArraysEqual(stableValuesRef.current, values)) {
		stableValuesRef.current = values;
	}

	return stableValuesRef.current;
}

type UseTextStylePanelPatchHandlerParams = {
	textItemId: number;
	resolvedStyle: TextStyle;
	onStylePreviewChange?: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
	onStyleChange?: (
		textItemId: number,
		stylePatch: Partial<TextStyle>,
	) => void;
};

export function useTextStylePanelPatchHandler({
	textItemId,
	resolvedStyle,
	onStylePreviewChange,
	onStyleChange,
}: UseTextStylePanelPatchHandlerParams) {
	const resolvedStyleRef = useRef(resolvedStyle);

	useEffect(() => {
		resolvedStyleRef.current = resolvedStyle;
	}, [resolvedStyle]);

	const emitPatchIfChanged = useCallback(
		(
			stylePatch: Partial<TextStyle>,
			onPatchStyle:
				| ((textItemId: number, stylePatch: Partial<TextStyle>) => void)
				| undefined,
		) => {
			if (!onPatchStyle) {
				return;
			}

			const patchEntries = Object.entries(stylePatch);
			if (patchEntries.length === 0) {
				return;
			}

			const currentStyle = resolvedStyleRef.current as Record<
				string,
				unknown
			>;
			const hasChanges = patchEntries.some(([patchKey, patchValue]) => {
				return currentStyle[patchKey] !== patchValue;
			});

			if (!hasChanges) {
				return;
			}

			onPatchStyle(textItemId, stylePatch);
		},
		[textItemId],
	);

	const commitPatchTextStyle = useCallback<PatchTextStyleHandler>(
		(stylePatch) => {
			emitPatchIfChanged(stylePatch, onStyleChange);
		},
		[emitPatchIfChanged, onStyleChange],
	);

	const previewPatchTextStyle = useCallback<PatchTextStyleHandler>(
		(stylePatch) => {
			emitPatchIfChanged(
				stylePatch,
				onStylePreviewChange ?? onStyleChange,
			);
		},
		[emitPatchIfChanged, onStyleChange, onStylePreviewChange],
	);

	return {
		previewPatchTextStyle,
		commitPatchTextStyle,
	};
}
