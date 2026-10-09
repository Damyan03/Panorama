import { formatTimeMs } from '../../../utils/formatters/time';
import NumberInput from './NumberInput';

type DurationInputProps = {
	valueMs?: number;
	onCommitMs?: (valueMs: number) => void;
	disabled?: boolean;
	className?: string;
};

function formatDurationSeconds(seconds: number): string {
	const safeSeconds = Math.max(0, Math.floor(seconds));

	if (safeSeconds < 60) {
		return `${safeSeconds}s`;
	}

	return formatTimeMs(safeSeconds * 1000);
}

function clampDurationMs(valueMs: number) {
	return Math.max(0, Math.floor(valueMs));
}

function parseDurationDraft(draftValue: string): number {
	const normalized = draftValue.trim().toLowerCase();

	if (normalized === '') {
		return 0;
	}

	const timeMatch = normalized.match(/(\d+)\s*:\s*(\d{1,2})/);
	if (timeMatch) {
		return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
	}

	const minuteMatch = normalized.match(/(\d+)\s*m\b/);
	if (minuteMatch) {
		return Number(minuteMatch[1]) * 60;
	}

	const secondMatch = normalized.match(/(\d+)\s*s\b/);
	if (secondMatch) {
		return Number(secondMatch[1]);
	}

	const parsedSeconds = Number.parseInt(normalized, 10);
	return Number.isFinite(parsedSeconds) ? parsedSeconds : 0;
}

function DurationInput({
	valueMs = 0,
	onCommitMs,
	disabled = false,
	className = '',
}: DurationInputProps) {
	const safeMs = Number.isFinite(valueMs) ? clampDurationMs(valueMs) : 0;
	const seconds = Math.floor(safeMs / 1000);

	function handleCommitSeconds(nextSeconds: number) {
		const nextMs = Math.max(0, Math.floor(nextSeconds)) * 1000;
		onCommitMs?.(nextMs);
	}

	return (
		<NumberInput
			value={seconds}
			onCommit={handleCommitSeconds}
			disabled={disabled}
			className={className}
			formatValue={formatDurationSeconds}
			parseDraft={parseDurationDraft}
			isAllowed={(nextValue) => /^[0-9ms:=\s]*$/i.test(nextValue)}
		/>
	);
}

export default DurationInput;
