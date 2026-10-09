import { memo, type ChangeEvent } from 'react';

type GeneralSettingsPanelProps = {
	title: string;
	coverUrl: string;
	description: string;
	onTitleChange: (nextTitle: string) => void;
	onCoverUrlChange: (nextCoverUrl: string) => void;
	onDescriptionChange: (nextDescription: string) => void;
};

function GeneralSettingsPanel({
	title,
	coverUrl,
	description,
	onTitleChange,
	onCoverUrlChange,
	onDescriptionChange,
}: GeneralSettingsPanelProps) {
	const handleTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
		onTitleChange(event.target.value);
	};

	const handleCoverUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
		onCoverUrlChange(event.target.value);
	};

	const handleDescriptionChange = (
		event: ChangeEvent<HTMLTextAreaElement>,
	) => {
		onDescriptionChange(event.target.value);
	};

	return (
		<section className="card flex flex-col gap-4 p-4">
			<div className="flex flex-col gap-1">
				<label
					htmlFor="editor-general-title"
					className="text-label-sm text-muted"
				>
					Video title
				</label>
				<input
					id="editor-general-title"
					type="text"
					className="input"
					value={title}
					onChange={handleTitleChange}
					placeholder="Not set"
				/>
			</div>
			<div className="flex flex-col gap-1">
				<label
					htmlFor="editor-general-cover-url"
					className="text-label-sm text-muted"
				>
					Cover URL
				</label>
				<input
					id="editor-general-cover-url"
					type="text"
					className="input"
					value={coverUrl}
					onChange={handleCoverUrlChange}
					placeholder="Not set"
				/>
			</div>
			<div className="flex flex-col gap-1">
				<label
					htmlFor="editor-general-description"
					className="text-label-sm text-muted"
				>
					Description
				</label>
				<textarea
					id="editor-general-description"
					className="input min-h-24 resize-none"
					value={description}
					onChange={handleDescriptionChange}
					placeholder="Not set"
				/>
			</div>
		</section>
	);
}

export default memo(GeneralSettingsPanel);
