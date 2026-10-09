import LegalPage from '../components/LegalPage';

export default function PrivacyPage() {
	return (
		<LegalPage
			title="Privacy Policy"
			lastUpdated="May 10, 2026"
			sections={[
				{
					title: 'Information we collect',
					body: [
						'We may collect account details, user-generated content, and basic usage data needed to operate Panorama.',
						'We only collect what is reasonably necessary to provide the service and maintain it.',
					],
				},
				{
					title: 'How we use information',
					body: [
						'We use this information to authenticate users, store drafts, serve content, and improve platform reliability.',
						'We do not sell personal information.',
					],
				},
				{
					title: 'Retention and sharing',
					body: [
						'We retain data only as long as needed for the service, legal obligations, and legitimate operational needs.',
						'We may share data only when required to run the service, comply with the law, or protect users and the platform.',
					],
				},
			]}
		/>
	);
}
