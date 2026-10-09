type LegalPageSection = {
	title: string;
	body: string[];
};

type LegalPageProps = {
	title: string;
	lastUpdated: string;
	sections: LegalPageSection[];
};

function LegalPage({ title, lastUpdated, sections }: LegalPageProps) {
	return (
		<div className="mx-auto w-full max-w-4xl px-4 py-8">
			<div className="rounded-3xl border border-overlay-light-10 bg-bg-secondary/80 p-6 shadow-2xl backdrop-blur">
				<div className="mb-8 border-b border-overlay-light-10 pb-5">
					<p className="text-sm uppercase tracking-[0.3em] text-text-muted">
						Legal
					</p>
					<h1 className="mt-3 text-3xl font-bold text-text-primary md:text-4xl">
						{title}
					</h1>
					<p className="mt-3 text-sm text-text-muted">
						Last updated: {lastUpdated}
					</p>
				</div>

				<div className="space-y-8 text-text-secondary">
					{sections.map((section) => (
						<section key={section.title} className="space-y-3">
							<h2 className="text-xl font-semibold text-text-primary">
								{section.title}
							</h2>
							<div className="space-y-3 leading-7">
								{section.body.map((paragraph) => (
									<p key={paragraph}>{paragraph}</p>
								))}
							</div>
						</section>
					))}
				</div>
			</div>
		</div>
	);
}

export default LegalPage;
