import { useMemo, useState } from 'react';

const segments = [
	'Prize 1',
	'Prize 2',
	'Prize 3',
	'Prize 4',
	'Prize 5',
	'Prize 6',
];

export default function WheelPage() {
	const [rotation, setRotation] = useState(0);
	const [spinning, setSpinning] = useState(false);
	const [result, setResult] = useState<string | null>(null);

	const count = segments.length;
	const angle = 360 / count;

	const wheelBackground = useMemo(() => {
		const colors = [
			'var(--color-error)',
			'var(--color-warning)',
			'var(--color-success)',
			'var(--color-accent-cyan)',
			'var(--color-accent-purple)',
			'var(--color-primary-light)',
		];
		const stops = segments.map((_s, i) => {
			const start = i * angle;
			const end = start + angle;
			const color = colors[i % colors.length];
			return `${color} ${start}deg ${end}deg`;
		});
		return `conic-gradient(${stops.join(', ')})`;
	}, [angle]);

	const spin = () => {
		if (spinning) return;
		setResult(null);
		setSpinning(true);
		const index = Math.floor(Math.random() * count);

		const center = (index + 0.5) * angle;
		const extraSpins = 5 + Math.floor(Math.random() * 3);
		const target = extraSpins * 360 + (360 - center);

		setRotation((r) => r + target);

		const durationMs = 4000;
		setTimeout(() => {
			setSpinning(false);
			setResult(segments[index]);
		}, durationMs + 50);
	};

	return (
		<div className="container-main flex justify-center p-6">
			<div className="text-center text-text-primary">
				<h2 className="mb-3 text-heading-sm">
					Simple Wheel of Fortune
				</h2>

				<div className="relative mx-auto h-80 w-80">
					<div
						className={`wheel h-80 w-80 rounded-full border-4 border-border shadow-lg ${spinning ? 'transition-transform duration-4000 ease-in-out' : 'transition-transform duration-500 ease-out'}`}
						style={{
							background: wheelBackground,
							transform: `rotate(${rotation}deg)`,
						}}
						aria-hidden
					/>

					<div
						className="absolute left-1/2 -top-2 -translate-x-1/2 w-0 h-0"
						style={{
							borderLeft: '12px solid transparent',
							borderRight: '12px solid transparent',
							borderBottom: '20px solid var(--color-accent-cyan)',
						}}
					/>
				</div>

				<div className="mt-4">
					<button
						onClick={spin}
						disabled={spinning}
						className={`btn btn-primary ${spinning ? 'cursor-default opacity-60' : ''}`}
					>
						{spinning ? 'Spinning…' : 'Spin'}
					</button>
				</div>

				<div className="mt-3 min-h-5.5">
					{result ? (
						<strong>Result: {result}</strong>
					) : (
						<span>Click Spin to try your luck</span>
					)}
				</div>
			</div>
		</div>
	);
}
