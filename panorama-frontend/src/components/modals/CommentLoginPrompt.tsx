import AuthLoginPrompt from './AuthLoginPrompt';

type Props = {
	open: boolean;
	onClose: () => void;
};

export default function CommentLoginPrompt({ open, onClose }: Props) {
	return (
		<AuthLoginPrompt
			open={open}
			onClose={onClose}
			title="Sign in to comment"
			description="Create an account or log in to leave comments, edit your own posts, and join the discussion on this video."
			signupLabel="Create account"
		/>
	);
}
