import { memo, useCallback } from 'react';
import SelectInput, {
	type SelectInputOption,
	type SelectInputProps,
} from './SelectInput';

type FontInputProps = Omit<
	SelectInputProps,
	'renderOption' | 'renderSelectedValue'
>;

function getPreviewFontFamily(value: string) {
	return value === 'inherit' ? 'var(--font-main)' : value;
}

function FontInput({
	placeholder = 'Select font',
	ariaLabel,
	'aria-label': ariaLabelFromProps,
	...selectProps
}: FontInputProps) {
	const resolvedAriaLabel = ariaLabel ?? ariaLabelFromProps ?? 'Font family';
	const renderSelectedValue = useCallback(
		(option: SelectInputOption | undefined) => (
			<span
				className="truncate"
				style={
					option
						? {
								fontFamily: getPreviewFontFamily(option.value),
							}
						: undefined
				}
			>
				{option?.label ?? placeholder}
			</span>
		),
		[placeholder],
	);
	const renderOption = useCallback((option: SelectInputOption) => {
		return (
			<div
				className="truncate text-sm leading-tight"
				style={{
					fontFamily: getPreviewFontFamily(option.value),
				}}
			>
				{option.label}
			</div>
		);
	}, []);

	return (
		<SelectInput
			{...selectProps}
			ariaLabel={resolvedAriaLabel}
			placeholder={placeholder}
			renderSelectedValue={renderSelectedValue}
			renderOption={renderOption}
		/>
	);
}

export default memo(FontInput);
