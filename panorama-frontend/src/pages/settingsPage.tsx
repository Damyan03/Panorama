import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { getPasswordError } from '../auth/validation';
import {
	changeMyPassword,
	getMySettings,
	updateMySettings,
	type UpdateUserSettingsRequest,
	type UserSettings,
} from '../api/users';
import { useToast } from '../hooks';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import { getInitial } from '../utils/userDisplay';

type ApiErrorBody = { message?: string };

function normalizeLabels(labels: string[]): string[] {
	return labels
		.map((label) => label.trim())
		.filter((label) => label.length > 0)
		.filter((label, index, arr) => {
			const lowered = label.toLowerCase();
			return (
				arr.findIndex((item) => item.toLowerCase() === lowered) ===
				index
			);
		})
		.slice(0, 8);
}

function parseLabelsInput(value: string): string[] {
	return normalizeLabels(value.split(','));
}

function labelsEqual(left: string[], right: string[]): boolean {
	if (left.length !== right.length) return false;
	return left.every(
		(label, index) => label.toLowerCase() === right[index]?.toLowerCase(),
	);
}

function readApiMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) {
		try {
			const parsed = JSON.parse(error.body) as ApiErrorBody;
			if (parsed?.message) return parsed.message;
		} catch {
			/* body wasn't JSON */
		}
	}
	return fallback;
}

function SettingsPage() {
	const { user, isReady, isAuthenticated, updateUser } = useAuth();
	const navigate = useNavigate();
	const toast = useToast();

	const [settings, setSettings] = useState<UserSettings | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const [displayName, setDisplayName] = useState('');
	const [username, setUsername] = useState('');
	const [email, setEmail] = useState('');
	const [profilePicUrl, setProfilePicUrl] = useState('');
	const [profileDescription, setProfileDescription] = useState('');
	const [gender, setGender] = useState('');
	const [labelsInput, setLabelsInput] = useState('');
	const [ageInput, setAgeInput] = useState('');
	const [nationality, setNationality] = useState('');
	const [profileSaving, setProfileSaving] = useState(false);
	const [profileError, setProfileError] = useState<string | null>(null);

	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [passwordSaving, setPasswordSaving] = useState(false);
	const [passwordError, setPasswordError] = useState<string | null>(null);

	useEffect(() => {
		if (!isReady) return;
		if (!isAuthenticated) {
			setIsLoading(false);
			return;
		}

		let active = true;
		setIsLoading(true);
		void getMySettings()
			.then((data) => {
				if (!active) return;
				setSettings(data);
				setDisplayName(data.displayName);
				setUsername(data.username);
				setEmail(data.email);
				setProfilePicUrl(data.profilePicUrl);
				setProfileDescription(data.profileDescription ?? '');
				setGender(data.gender ?? '');
				setLabelsInput((data.labels ?? []).join(', '));
				setAgeInput(
					data.age !== null && data.age !== undefined
						? String(data.age)
						: '',
				);
				setNationality(data.nationality ?? '');
				setLoadError(null);
			})
			.catch((err: unknown) => {
				if (!active) return;
				setLoadError(
					readApiMessage(err, 'Unable to load your settings.'),
				);
			})
			.finally(() => {
				if (active) setIsLoading(false);
			});

		return () => {
			active = false;
		};
	}, [isReady, isAuthenticated]);

	function buildSettingsDiff(
		parsedLabels: string[],
		parsedAge: number | null,
	): UpdateUserSettingsRequest | null {
		if (!settings) return null;
		const diff: UpdateUserSettingsRequest = {};
		const currentLabels = normalizeLabels(settings.labels ?? []);
		const trimmed = {
			displayName: displayName.trim(),
			username: username.trim(),
			email: email.trim(),
			profilePicUrl: profilePicUrl.trim(),
			profileDescription: profileDescription.trim(),
			gender: gender.trim(),
			nationality: nationality.trim(),
		};
		if (trimmed.displayName !== settings.displayName)
			diff.displayName = trimmed.displayName;
		if (trimmed.username !== settings.username)
			diff.username = trimmed.username;
		if (trimmed.email.toLowerCase() !== settings.email.toLowerCase())
			diff.email = trimmed.email;
		if (trimmed.profilePicUrl !== settings.profilePicUrl)
			diff.profilePicUrl = trimmed.profilePicUrl;
		if (trimmed.profileDescription !== (settings.profileDescription ?? ''))
			diff.profileDescription = trimmed.profileDescription;
		if (trimmed.gender !== (settings.gender ?? ''))
			diff.gender = trimmed.gender;
		if (!labelsEqual(parsedLabels, currentLabels))
			diff.labels = parsedLabels;
		if (parsedAge !== null && parsedAge !== settings.age)
			diff.age = parsedAge;
		if (trimmed.nationality !== (settings.nationality ?? ''))
			diff.nationality = trimmed.nationality;
		return diff;
	}

	async function handleSaveProfile(event: React.FormEvent) {
		event.preventDefault();
		if (!settings) return;
		setProfileError(null);

		const parsedLabels = parseLabelsInput(labelsInput);
		if (parsedLabels.some((label) => label.length > 32)) {
			setProfileError('Each label must be 32 characters or fewer.');
			return;
		}

		const rawAge = ageInput.trim();
		let parsedAge: number | null = null;
		if (rawAge.length > 0) {
			parsedAge = Number.parseInt(rawAge, 10);
			if (
				!Number.isInteger(parsedAge) ||
				parsedAge < 13 ||
				parsedAge > 120
			) {
				setProfileError(
					'Age must be a whole number between 13 and 120.',
				);
				return;
			}
		}

		const diff = buildSettingsDiff(parsedLabels, parsedAge);
		if (!diff || Object.keys(diff).length === 0) {
			toast.info('No changes to save.');
			return;
		}

		if (diff.displayName !== undefined && diff.displayName.length === 0) {
			setProfileError('Display name cannot be empty.');
			return;
		}
		if (
			diff.username !== undefined &&
			!/^[a-zA-Z0-9_]{3,100}$/.test(diff.username)
		) {
			setProfileError(
				'Username must be 3+ chars: letters, numbers, underscores.',
			);
			return;
		}

		setProfileSaving(true);
		try {
			const updated = await updateMySettings(diff);
			setSettings(updated);
			setDisplayName(updated.displayName);
			setUsername(updated.username);
			setEmail(updated.email);
			setProfilePicUrl(updated.profilePicUrl);
			setProfileDescription(updated.profileDescription ?? '');
			setGender(updated.gender ?? '');
			setLabelsInput((updated.labels ?? []).join(', '));
			setAgeInput(
				updated.age !== null && updated.age !== undefined
					? String(updated.age)
					: '',
			);
			setNationality(updated.nationality ?? '');
			// Reflect new name/avatar in header & sidebar without an extra /auth/me round trip.
			if (user) {
				updateUser({
					...user,
					username: updated.username,
					email: updated.email,
					displayName: updated.displayName,
					profileDescription: updated.profileDescription,
					gender: updated.gender,
					labels: updated.labels,
					age: updated.age,
					nationality: updated.nationality,
					profilePicUrl: updated.profilePicUrl,
					role: updated.role,
				});
			}
			toast.success('Profile updated.');
		} catch (err: unknown) {
			setProfileError(readApiMessage(err, 'Unable to save changes.'));
		} finally {
			setProfileSaving(false);
		}
	}

	async function handleChangePassword(event: React.FormEvent) {
		event.preventDefault();
		setPasswordError(null);

		if (!currentPassword) {
			setPasswordError('Enter your current password.');
			return;
		}
		const newError = getPasswordError(newPassword);
		if (newError) {
			setPasswordError(newError);
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordError('New passwords do not match.');
			return;
		}

		setPasswordSaving(true);
		try {
			await changeMyPassword({ currentPassword, newPassword });
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			toast.success('Password changed.');
		} catch (err: unknown) {
			setPasswordError(readApiMessage(err, 'Unable to change password.'));
		} finally {
			setPasswordSaving(false);
		}
	}

	if (!isReady || isLoading) {
		return (
			<div className="container-main py-6 max-w-2xl mx-auto">
				<h1 className="text-heading-md">Account settings</h1>
				<p className="mt-4 text-muted">Loading...</p>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="container-main py-6 max-w-2xl mx-auto">
				<div className="card-panel">
					<h1 className="text-heading-md">Sign in required</h1>
					<p className="mt-3 text-muted">
						You need to be signed in to manage account settings.
					</p>
					<button
						type="button"
						className="btn btn-primary btn-sm mt-4"
						onClick={() => navigate('/login')}
					>
						Log in
					</button>
				</div>
			</div>
		);
	}

	if (loadError || !settings) {
		return (
			<div className="container-main py-6 max-w-2xl mx-auto">
				<div className="card-panel">
					<h1 className="text-heading-md">Settings unavailable</h1>
					<p className="mt-3 text-muted">
						{loadError ?? 'Unknown error'}
					</p>
				</div>
			</div>
		);
	}

	const initial = getInitial(settings.displayName || settings.username);

	return (
		<div className="container-main py-6 max-w-2xl mx-auto flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-heading-md">Account settings</h1>
				<Link
					to={`/u/${settings.username}`}
					className="btn btn-ghost btn-sm"
				>
					View profile
				</Link>
			</div>

			<form
				onSubmit={handleSaveProfile}
				className="card-panel flex flex-col gap-4"
				aria-label="Profile settings"
			>
				<h2 className="text-heading-sm">Profile</h2>

				<div className="flex items-center gap-4">
					<div className="h-16 w-16 shrink-0">
						<ProfileAvatar
							src={profilePicUrl || undefined}
							alt={displayName || settings.username}
							initial={initial}
						/>
					</div>
					<div className="flex-1">
						<label className="text-label-md" htmlFor="profilePic">
							Profile picture URL
						</label>
						<input
							id="profilePic"
							type="url"
							value={profilePicUrl}
							onChange={(e) => setProfilePicUrl(e.target.value)}
							placeholder="https://..."
							maxLength={500}
							disabled={profileSaving}
							className="input mt-1 w-full"
						/>
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="displayName">
						Display name
					</label>
					<input
						id="displayName"
						type="text"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						maxLength={200}
						disabled={profileSaving}
						className="input"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label
						className="text-label-md"
						htmlFor="profileDescription"
					>
						Profile description
					</label>
					<textarea
						id="profileDescription"
						value={profileDescription}
						onChange={(e) => setProfileDescription(e.target.value)}
						maxLength={1000}
						disabled={profileSaving}
						className="input min-h-24"
						placeholder="Tell people a little about yourself"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="gender">
						Gender
					</label>
					<input
						id="gender"
						type="text"
						value={gender}
						onChange={(e) => setGender(e.target.value)}
						maxLength={60}
						disabled={profileSaving}
						className="input"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="labels">
						Labels
					</label>
					<input
						id="labels"
						type="text"
						value={labelsInput}
						onChange={(e) => setLabelsInput(e.target.value)}
						maxLength={300}
						disabled={profileSaving}
						className="input"
						placeholder="Creator, Verified"
					/>
					<span className="text-muted">
						Comma-separated, up to 8 labels.
					</span>
				</div>

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div className="flex flex-col gap-1">
						<label className="text-label-md" htmlFor="age">
							Age
						</label>
						<input
							id="age"
							type="number"
							value={ageInput}
							onChange={(e) => setAgeInput(e.target.value)}
							min={13}
							max={120}
							disabled={profileSaving}
							className="input"
						/>
					</div>

					<div className="flex flex-col gap-1">
						<label className="text-label-md" htmlFor="nationality">
							Nationality
						</label>
						<input
							id="nationality"
							type="text"
							value={nationality}
							onChange={(e) => setNationality(e.target.value)}
							maxLength={100}
							disabled={profileSaving}
							className="input"
						/>
					</div>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="username">
						Username
					</label>
					<input
						id="username"
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						maxLength={100}
						disabled={profileSaving}
						className="input"
						autoComplete="username"
					/>
					<span className="text-muted">
						3+ chars: letters, numbers, underscores.
					</span>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="email">
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						maxLength={254}
						disabled={profileSaving}
						className="input"
						autoComplete="email"
					/>
				</div>

				{profileError && (
					<div className="badge badge-error w-full justify-start">
						{profileError}
					</div>
				)}

				<div className="flex justify-end">
					<button
						type="submit"
						disabled={profileSaving}
						className="btn btn-primary btn-sm"
					>
						{profileSaving ? 'Saving...' : 'Save changes'}
					</button>
				</div>
			</form>

			<form
				onSubmit={handleChangePassword}
				className="card-panel flex flex-col gap-4"
				aria-label="Change password"
			>
				<h2 className="text-heading-sm">Change password</h2>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="currentPassword">
						Current password
					</label>
					<input
						id="currentPassword"
						type="password"
						value={currentPassword}
						onChange={(e) => setCurrentPassword(e.target.value)}
						disabled={passwordSaving}
						autoComplete="current-password"
						className="input"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="newPassword">
						New password
					</label>
					<input
						id="newPassword"
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						disabled={passwordSaving}
						autoComplete="new-password"
						className="input"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<label className="text-label-md" htmlFor="confirmPassword">
						Confirm new password
					</label>
					<input
						id="confirmPassword"
						type="password"
						value={confirmPassword}
						onChange={(e) => setConfirmPassword(e.target.value)}
						disabled={passwordSaving}
						autoComplete="new-password"
						className="input"
					/>
				</div>

				{passwordError && (
					<div className="badge badge-error w-full justify-start">
						{passwordError}
					</div>
				)}

				<div className="flex justify-end">
					<button
						type="submit"
						disabled={passwordSaving}
						className="btn btn-primary btn-sm"
					>
						{passwordSaving ? 'Saving...' : 'Change password'}
					</button>
				</div>
			</form>
		</div>
	);
}

export default SettingsPage;
