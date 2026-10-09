import CommentIdentity from './CommentIdentity';

type Props = {
	author: string;
	timestamp: string;
	authorUsername?: string;
	avatarUrl?: string;
	labels?: string[];
	value: string;
	onChange: (value: string) => void;
	onCancel: () => void;
	onSave: () => void;
	disabled: boolean;
};

export default function CommentEditorForm({
	author,
	timestamp,
	authorUsername,
	avatarUrl,
	labels,
	value,
	onChange,
	onCancel,
	onSave,
	disabled,
}: Props) {
	return (
		<div className="flex flex-col gap-3">
			<CommentIdentity
				author={author}
				timestamp={timestamp}
				authorUsername={authorUsername}
				avatarUrl={avatarUrl}
				labels={labels}
				subtitle="Editing"
			/>
			<textarea
				value={value}
				onChange={(event) => onChange(event.target.value)}
				maxLength={2000}
				disabled={disabled}
				className="input min-h-24 resize-y"
			/>
			<div className="flex items-center justify-end gap-2">
				<button
					type="button"
					onClick={onCancel}
					disabled={disabled}
					className="btn btn-ghost btn-sm"
				>
					Cancel
				</button>
				<button
					type="button"
					onClick={onSave}
					disabled={disabled || value.trim().length === 0}
					className="btn btn-primary btn-sm"
				>
					Save
				</button>
			</div>
		</div>
	);
}
