import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from './constants';

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
	return EMAIL_PATTERN.test(email);
}

/**
 * Validates password length
 */
export function isValidPassword(password: string): boolean {
	return password.length >= MIN_PASSWORD_LENGTH;
}

/**
 * Returns validation error message or null if valid
 */
export function getEmailError(email: string): string | null {
	if (!email.trim()) {
		return 'Email is required';
	}
	if (!isValidEmail(email)) {
		return 'Please enter a valid email address';
	}
	return null;
}

/**
 * Returns validation error message or null if valid
 */
export function getPasswordError(password: string): string | null {
	if (!password) {
		return 'Password is required';
	}
	if (!isValidPassword(password)) {
		return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
	}
	return null;
}

/**
 * Returns validation error message or null if passwords match
 */
export function getPasswordMismatchError(
	password: string,
	confirmPassword: string,
): string | null {
	if (password !== confirmPassword) {
		return 'Passwords do not match';
	}
	return null;
}
