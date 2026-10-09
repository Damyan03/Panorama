import AuthLoginPrompt from './AuthLoginPrompt';

type Props = {
	open: boolean;
	onClose: () => void;
};

export default function LikeLoginPrompt({ open, onClose }: Props) {
	return (
		<AuthLoginPrompt
			open={open}
			onClose={onClose}
			title="Sign in to like this video"
			description="Create an account or log in to like this video, keep track of the videos you enjoy, and build a personalized list of favorites."
			signupLabel="Create account"
		/>
	);
}
