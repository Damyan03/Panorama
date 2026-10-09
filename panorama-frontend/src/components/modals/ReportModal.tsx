import { useState } from 'react';
import Modal from '../ui/Modal';
import { postReport } from '../../api/reports';
import { useToast } from '../../hooks';
import { useAuth } from '../../auth/AuthContext';
import { SelectInput } from '../ui/inputs';

declare global {
	interface Window {
		grecaptcha?: {
			execute(
				siteKey: string,
				options: { action: string },
			): Promise<string>;
		};
	}
}

type Props = {
	open: boolean;
	resourceType: string;
	resourceId: number;
	onClose: () => void;
};

const REASONS = [
	{ value: 'spam', label: 'Spam or advertising' },
	{ value: 'harassment', label: 'Harassment or hate' },
	{ value: 'sexual', label: 'Sexual content' },
	{ value: 'self-harm', label: 'Self-harm' },
	{ value: 'other', label: 'Other' },
];

export default function ReportModal({
	open,
	resourceType,
	resourceId,
	onClose,
}: Props) {
	const { isAuthenticated } = useAuth();
	const [reason, setReason] = useState(REASONS[0].value);
	const [details, setDetails] = useState('');
	const [loading, setLoading] = useState(false);
	const { success: showSuccess, error: showError } = useToast();

	const siteKey = import.meta.env.RECAPTCHA_SITE_KEY as string | undefined;

	const loadRecaptcha = (key: string) =>
		new Promise<void>((resolve, reject) => {
			if (typeof window === 'undefined')
				return reject(new Error('No window'));
			if (window.grecaptcha) return resolve();
			const script = document.createElement('script');
			script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
			script.async = true;
			script.defer = true;
			script.onload = () => resolve();
			script.onerror = () =>
				reject(new Error('Failed to load recaptcha'));
			document.head.appendChild(script);
		});

	const getRecaptchaToken = async (action = 'report') => {
		if (!siteKey) throw new Error('Missing recaptcha site key');
		await loadRecaptcha(siteKey);
		if (!window.grecaptcha) throw new Error('recaptcha not available');
		return await window.grecaptcha.execute(siteKey, { action });
	};

	const submit = async () => {
		setLoading(true);
		try {
			let captchaToken: string | undefined;
			if (!isAuthenticated) {
				if (!siteKey) {
					showError(
						'Reporting anonymously requires a site key configuration.',
					);
					setLoading(false);
					return;
				}
				try {
					captchaToken = await getRecaptchaToken();
				} catch {
					showError('Unable to complete captcha.');
					setLoading(false);
					return;
				}
			}

			await postReport({
				resourceType,
				resourceId,
				reason,
				details: details || null,
				captchaToken: captchaToken ?? null,
			});
			showSuccess('Report submitted');
			onClose();
		} catch {
			showError('Unable to submit report');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal
			open={open}
			title="Report"
			onClose={onClose}
			description="Select a reason and submit the report."
		>
			<div className="flex flex-col gap-4">
				<div>
					<label className="text-label-sm text-muted">Reason</label>
					<SelectInput
						value={reason}
						options={REASONS}
						onChangeValue={setReason}
						containerClassName="mt-2"
						aria-label="Reason"
					/>
				</div>

				<div>
					<label className="text-label-sm text-muted">
						Details (optional)
					</label>
					<textarea
						value={details}
						onChange={(e) => setDetails(e.target.value)}
						className="input mt-2 w-full"
						rows={4}
					/>
				</div>

				<div className="flex justify-end gap-2">
					<button
						type="button"
						onClick={onClose}
						className="btn btn-ghost"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={submit}
						disabled={loading}
						className="btn btn-primary"
					>
						{loading ? 'Submitting...' : 'Submit'}
					</button>
				</div>
			</div>
		</Modal>
	);
}
