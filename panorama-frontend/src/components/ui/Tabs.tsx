import { memo } from 'react';

type TabsOption<TValue extends string> = {
	label: string;
	value: TValue;
	disabled?: boolean;
};

type TabsBaseProps<TValue extends string> = {
	options: readonly TabsOption<TValue>[];
	ariaLabel?: string;
	className?: string;
	buttonClassName?: string;
	activeButtonClassName?: string;
	inactiveButtonClassName?: string;
};

type TabsDeselectableProps<TValue extends string> = TabsBaseProps<TValue> & {
	allowDeselect: true;
	value: TValue | null;
	onChange?: (nextValue: TValue | null) => void;
};

type TabsSingleSelectProps<TValue extends string> = TabsBaseProps<TValue> & {
	allowDeselect?: false | undefined;
	value: TValue;
	onChange?: (nextValue: TValue) => void;
};

type TabsProps<TValue extends string> =
	| TabsDeselectableProps<TValue>
	| TabsSingleSelectProps<TValue>;

function getClasses(...classes: Array<string | undefined>) {
	return classes.filter(Boolean).join(' ');
}

function Tabs<TValue extends string>(props: TabsProps<TValue>) {
	const {
		options,
		value,
		ariaLabel,
		className,
		buttonClassName,
		activeButtonClassName = 'btn-primary',
		inactiveButtonClassName = 'btn-ghost',
	} = props;

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={getClasses('flex gap-2', className)}
		>
			{options.map((option) => {
				const isActive = option.value === value;

				return (
					<button
						key={option.value}
						type="button"
						disabled={option.disabled}
						onClick={() => {
							if (option.disabled) {
								return;
							}

							if (props.allowDeselect === true) {
								props.onChange?.(
									isActive ? null : option.value,
								);
								return;
							}

							props.onChange?.(option.value);
						}}
						aria-pressed={isActive}
						className={getClasses(
							'btn',
							buttonClassName,
							isActive
								? activeButtonClassName
								: inactiveButtonClassName,
						)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}

export type { TabsOption, TabsProps };
export default memo(Tabs) as typeof Tabs;
