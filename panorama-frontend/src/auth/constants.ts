/**
 * Authentication constants and configuration
 */

/** localStorage key for storing JWT access token */
export const AUTH_TOKEN_KEY = 'unnamed-site.auth.token';

/** localStorage key for storing authenticated user info */
export const AUTH_USER_KEY = 'unnamed-site.auth.user';

/** Default error message for login failures */
export const LOGIN_ERROR_MESSAGE = 'Invalid username/email or password.';

/** Default error message for registration failures */
export const REGISTER_ERROR_MESSAGE =
	'Registration failed. Email may already exist.';

/** Minimum password length requirement */
export const MIN_PASSWORD_LENGTH = 8;

/** Regex pattern for email validation */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
