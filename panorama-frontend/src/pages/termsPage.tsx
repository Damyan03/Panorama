import LegalPage from '../components/LegalPage';

export default function TermsPage() {
	return (
		<LegalPage
			title="Terms of Service"
			lastUpdated="May 10, 2026"
			sections={[
				{
					title: 'Acceptance of terms',
					body: [
						'By using Panorama, you agree to follow these terms and any additional rules posted on the site.',
						'If you do not agree with these terms, you should not use the service.',
					],
				},
				{
					title: 'Account responsibilities',
					body: [
						'You are responsible for the activity that happens under your account and for keeping your login details secure.',
						'You must provide accurate information when creating or updating your profile.',
					],
				},
				{
					title: 'Content and conduct',
					body: [
						'You may not upload content that violates applicable law, infringes rights, or disrupts the service.',
						'We may remove content or suspend accounts when necessary to protect the platform or its users.',
					],
				},
			]}
		/>
	);
}
