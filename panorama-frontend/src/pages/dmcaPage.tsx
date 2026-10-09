import LegalPage from '../components/LegalPage';

export default function DmcaPage() {
	return (
		<LegalPage
			title="DMCA Policy"
			lastUpdated="May 10, 2026"
			sections={[
				{
					title: 'Copyright complaints',
					body: [
						'If you believe material on Panorama infringes your copyright, send a notice with the required identification and contact details.',
						'We will review valid notices and take appropriate action where required.',
					],
				},
				{
					title: 'Counter-notices',
					body: [
						'If your content was removed by mistake or misidentification, you may submit a counter-notice with the information needed to review the claim.',
						'We may restore content when the dispute process permits it.',
					],
				},
				{
					title: 'Repeat infringement',
					body: [
						'Accounts that repeatedly violate copyright rules may be restricted or removed.',
						'We reserve the right to act on repeated or abusive infringement reports.',
					],
				},
			]}
		/>
	);
}
