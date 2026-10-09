import AuthLoginPrompt from './AuthLoginPrompt';

type Props = {
	open: boolean;
	onClose: () => void;
};

export default function CreateVideoLoginPrompt({ open, onClose }: Props) {
	return (
		<AuthLoginPrompt
			open={open}
			onClose={onClose}
			title="Start creating videos today"
			description="Sign in or create an account to start creating, publishing, and sharing your own videos. Build your creative portfolio and earn feedback from the Panorama community."
			signupLabel="Sign up to create"
		/>
	);
}
