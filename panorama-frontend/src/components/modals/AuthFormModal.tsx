import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
	getEmailError,
	getPasswordError,
	getPasswordMismatchError,
} from '../../auth/validation';
import {
	LOGIN_ERROR_MESSAGE,
	REGISTER_ERROR_MESSAGE,
} from '../../auth/constants';
import Modal from '../ui/Modal';

type AuthFormModalProps = {
	mode: 'login' | 'register';
	returnTo: string;
};

function AuthFormModal({ mode, returnTo }: AuthFormModalProps) {
	const navigate = useNavigate();
	const { isAuthenticated, login, register } = useAuth();

	const [usernameOrEmail, setUsernameOrEmail] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [touched, setTouched] = useState<Record<string, boolean>>({});

	if (isAuthenticated) {
		return <Navigate to={returnTo} replace />;
	}

	const title = mode === 'login' ? 'Login' : 'Create Account';
	const description =
		mode === 'login'
			? 'Sign in with your username or email.'
			: 'Join us with your email address.';

	function handleClose() {
		navigate(returnTo, { replace: true });
	}

	function validateLoginForm(): boolean {
		if (!usernameOrEmail.trim()) {
			setErrorMessage('Username or email is required');
			return false;
		}

		if (!password) {
			setErrorMessage('Password is required');
			return false;
		}

		return true;
	}

	function validateRegisterForm(): boolean {
		const emailError = getEmailError(email);
		const passwordError = getPasswordError(password);
		const confirmError = getPasswordMismatchError(
			password,
			confirmPassword,
		);

		if (emailError) {
			setErrorMessage(emailError);
			return false;
		}

		if (passwordError) {
			setErrorMessage(passwordError);
			return false;
		}

		if (confirmError) {
			setErrorMessage(confirmError);
			return false;
		}

		return true;
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);

		if (mode === 'login') {
			if (!validateLoginForm()) {
				return;
			}

			setIsSubmitting(true);

			try {
				await login({ usernameOrEmail, password });
				navigate(returnTo, { replace: true });
			} catch {
				setErrorMessage(LOGIN_ERROR_MESSAGE);
			} finally {
				setIsSubmitting(false);
			}

			return;
		}

		if (!validateRegisterForm()) {
			return;
		}

		setIsSubmitting(true);

		try {
			await register({ email, password });
			navigate(returnTo, { replace: true });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : REGISTER_ERROR_MESSAGE;
			setErrorMessage(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleFieldBlur(fieldName: string) {
		setTouched((prev) => ({ ...prev, [fieldName]: true }));
	}

	const emailError =
		mode === 'register' && touched.email ? getEmailError(email) : null;
	const passwordError =
		mode === 'register' && touched.password
			? getPasswordError(password)
			: null;
	const confirmError =
		mode === 'register' && touched.confirmPassword
			? getPasswordMismatchError(password, confirmPassword)
			: null;

	return (
		<Modal
			open
			title={title}
			description={description}
			onClose={handleClose}
		>
			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				{mode === 'login' ? (
					<>
						<div className="flex flex-col gap-2">
							<input
								type="text"
								placeholder="Username or email"
								value={usernameOrEmail}
								onChange={(event) =>
									setUsernameOrEmail(event.target.value)
								}
								autoComplete="username"
								disabled={isSubmitting}
								className="input"
								aria-label="Username or email"
							/>
						</div>

						<div className="flex flex-col gap-2">
							<input
								type="password"
								placeholder="Password"
								value={password}
								onChange={(event) =>
									setPassword(event.target.value)
								}
								autoComplete="current-password"
								disabled={isSubmitting}
								className="input"
								aria-label="Password"
							/>
						</div>
					</>
				) : (
					<>
						<div className="flex flex-col gap-2">
							<input
								type="email"
								placeholder="Email"
								value={email}
								onChange={(event) =>
									setEmail(event.target.value)
								}
								onBlur={() => handleFieldBlur('email')}
								disabled={isSubmitting}
								className="input"
								aria-label="Email"
							/>
							{emailError && (
								<span className="text-label-sm text-error">
									{emailError}
								</span>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<input
								type="password"
								placeholder="Password"
								value={password}
								onChange={(event) =>
									setPassword(event.target.value)
								}
								onBlur={() => handleFieldBlur('password')}
								disabled={isSubmitting}
								className="input"
								aria-label="Password"
							/>
							{passwordError && (
								<span className="text-label-sm text-error">
									{passwordError}
								</span>
							)}
						</div>

						<div className="flex flex-col gap-2">
							<input
								type="password"
								placeholder="Confirm Password"
								value={confirmPassword}
								onChange={(event) =>
									setConfirmPassword(event.target.value)
								}
								onBlur={() =>
									handleFieldBlur('confirmPassword')
								}
								disabled={isSubmitting}
								className="input"
								aria-label="Confirm password"
							/>
							{confirmError && (
								<span className="text-label-sm text-error">
									{confirmError}
								</span>
							)}
						</div>
					</>
				)}

				{errorMessage &&
					!emailError &&
					!passwordError &&
					!confirmError && (
						<div className="badge badge-error">{errorMessage}</div>
					)}

				<button
					type="submit"
					disabled={
						isSubmitting ||
						!!emailError ||
						!!passwordError ||
						!!confirmError
					}
					className="btn btn-primary btn-lg justify-center"
				>
					{isSubmitting
						? mode === 'login'
							? 'Signing in...'
							: 'Creating account...'
						: mode === 'login'
							? 'Login'
							: 'Register'}
				</button>
			</form>
		</Modal>
	);
}

export default AuthFormModal;
