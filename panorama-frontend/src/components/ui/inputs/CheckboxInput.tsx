import { memo, type ComponentPropsWithoutRef, type ReactNode } from 'react';

export type CheckboxInputProps = Omit<
	ComponentPropsWithoutRef<'input'>,
	'type' | 'checked' | 'defaultChecked' | 'onChange' | 'className'
> & {
	checked?: boolean;
	onChangeChecked?: (checked: boolean) => void;
	label?: ReactNode;
	className?: string;
	labelClassName?: string;
	ariaLabel?: string;
};

function CheckboxInput({
	checked = false,
	disabled = false,
	onChangeChecked,
	label,
	className,
	labelClassName,
	ariaLabel,
	'aria-label': ariaLabelFromProps,
	...inputProps
}: CheckboxInputProps) {
	const resolvedWrapperClassName = [
		'group relative inline-flex items-center gap-2 rounded-md select-none',
		disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
		typeof className === 'string' && className.trim().length > 0
			? className
			: undefined,
	]
		.filter(Boolean)
		.join(' ');
	const resolvedLabelClassName =
		typeof labelClassName === 'string' && labelClassName.trim().length > 0
			? labelClassName
			: 'text-sm text-text-secondary';

	return (
		<label className={resolvedWrapperClassName}>
			<input
				{...inputProps}
				type="checkbox"
				className="peer sr-only absolute opacity-0 pointer-events-none"
				checked={checked}
				disabled={disabled}
				aria-label={ariaLabel ?? ariaLabelFromProps}
				onChange={(event) => {
					onChangeChecked?.(event.currentTarget.checked);
				}}
			/>
			<span
				className="relative h-5 w-5 shrink-0 rounded-full border border-border/80 bg-bg-secondary shadow-sm transition-all duration-150 ease-out group-hover:border-primary/40 group-hover:bg-bg-elevated peer-checked:border-primary/60 peer-checked:bg-primary/10 peer-disabled:opacity-60 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-main"
				aria-hidden="true"
			>
				<span className="absolute inset-1 rounded-full bg-primary opacity-0 scale-60 transition-all duration-150 ease-out peer-checked:opacity-100 peer-checked:scale-100" />
			</span>
			{label ? (
				<span className={resolvedLabelClassName}>{label}</span>
			) : null}
		</label>
	);
}

export default memo(CheckboxInput);
