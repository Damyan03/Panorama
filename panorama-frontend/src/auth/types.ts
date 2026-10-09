export interface AuthenticatedUser {
	id: number;
	username: string;
	email: string;
	displayName: string;
	profileDescription: string;
	gender: string;
	labels: string[];
	age: number | null;
	nationality: string;
	role: string;
	profilePicUrl: string;
}

export interface LoginResponse {
	accessToken: string;
	tokenType: string;
	expiresAt: string;
	user: AuthenticatedUser;
}

export interface LoginRequest {
	usernameOrEmail: string;
	password: string;
}

export interface RegisterRequest {
	email: string;
	password: string;
}
