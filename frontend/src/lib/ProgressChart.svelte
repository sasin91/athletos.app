<script lang="ts">
	import type { DashboardPoint } from './dashboard';

	let { label, points }: { label: string; points: DashboardPoint[] } = $props();

	const WIDTH = 720;
	const HEIGHT = 348;
	const LEFT = 18;
	const RIGHT = 12;
	const PLOT_WIDTH = WIDTH - LEFT - RIGHT;

	const STRENGTH_TOP = 12;
	const STRENGTH_HEIGHT = 148;
	const DRIFT_TOP = 184;
	const DRIFT_HEIGHT = 60;
	const LOAD_TOP = 268;
	const LOAD_HEIGHT = 64;

	type PositionedPoint = DashboardPoint & { x: number };

	function finite(value: number | null | undefined): value is number {
		return typeof value === 'number' && Number.isFinite(value);
	}

	function extent(values: number[], fallback: [number, number]): [number, number] {
		if (values.length === 0) return fallback;

		const minimum = Math.min(...values);
		const maximum = Math.max(...values);
		if (minimum !== maximum) return [minimum, maximum];

		const padding = Math.max(Math.abs(minimum) * 0.05, 1);
		return [minimum - padding, maximum + padding];
	}

	function scale(value: number, domain: [number, number], range: [number, number]): number {
		const [domainStart, domainEnd] = domain;
		const ratio = (value - domainStart) / (domainEnd - domainStart);
		return range[0] + ratio * (range[1] - range[0]);
	}

	function timeOf(point: DashboardPoint, index: number): number {
		const parsed = Date.parse(point.at);
		return Number.isFinite(parsed) ? parsed : index;
	}

	function position(pointsToPosition: DashboardPoint[]): PositionedPoint[] {
		const times = pointsToPosition.map(timeOf);
		const timeDomain = extent(times, [0, 1]);

		return pointsToPosition.map((point, index) => ({
			...point,
			x:
				pointsToPosition.length === 1
					? LEFT + PLOT_WIDTH / 2
					: scale(times[index], timeDomain, [LEFT, LEFT + PLOT_WIDTH])
		}));
	}

	function linePath(
		positioned: PositionedPoint[],
		valueOf: (point: PositionedPoint) => number | null | undefined,
		yOf: (value: number) => number
	): string {
		let drawing = '';
		let penDown = false;

		for (const point of positioned) {
			const value = valueOf(point);
			if (!finite(value)) {
				penDown = false;
				continue;
			}

			drawing += `${penDown ? ' L' : 'M'} ${point.x.toFixed(2)} ${yOf(value).toFixed(2)}`;
			penDown = true;
		}

		return drawing;
	}

	const positioned = $derived(position(points));
	const strengthDomain = $derived(
		extent(
			positioned.flatMap((point) => [point.estimate, point.training_max].filter(finite)),
			[0, 1]
		)
	);
	const strengthY = (value: number) =>
		scale(value, strengthDomain, [STRENGTH_TOP + STRENGTH_HEIGHT, STRENGTH_TOP]);

	const driftMaximum = $derived(
		Math.max(
			1,
			...positioned.map((point) => (finite(point.drift_kg) ? Math.abs(point.drift_kg) : 0))
		)
	);
	const driftZero = DRIFT_TOP + DRIFT_HEIGHT / 2;
	const driftY = (value: number) =>
		scale(value, [-driftMaximum, driftMaximum], [DRIFT_TOP + DRIFT_HEIGHT, DRIFT_TOP]);

	const loadMaximum = $derived(
		Math.max(
			1,
			...positioned.map((point) =>
				finite(point.load_moved_kg) ? Math.max(0, point.load_moved_kg) : 0
			)
		)
	);
	const loadY = (value: number) =>
		scale(value, [0, loadMaximum], [LOAD_TOP + LOAD_HEIGHT, LOAD_TOP]);
	const markWidth = $derived(
		Math.max(4, Math.min(18, PLOT_WIDTH / Math.max(points.length * 2.5, 1)))
	);

	const estimatePath = $derived(linePath(positioned, (point) => point.estimate, strengthY));
	const trainingMaxPath = $derived(linePath(positioned, (point) => point.training_max, strengthY));
	const summary = $derived(
		points.length === 0
			? `No recorded ${label} sessions in this period.`
			: `${points.length} recorded ${label} ${points.length === 1 ? 'session' : 'sessions'}.`
	);
</script>

<!--
	One time axis, three questions. The faint vertical uprights are the signature:
	each workout occupies one rack position all the way from strength, through
	drift, to work done. The athlete can follow a session down without comparing
	three unrelated card charts.

	There are deliberately no visible values or legends in this component. Task 9
	places those in ordinary text where they remain readable without interpreting
	an SVG; this component owns only geometry and its equivalent accessible summary.
-->
<svg
	class="block h-auto w-full overflow-visible"
	viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
	role="img"
	aria-label={`${label} progress chart`}
	preserveAspectRatio="none"
>
	<title>{label} progress chart</title>
	<desc>{summary}</desc>

	<!-- Quiet panel surfaces establish three measures without making three cards. -->
	<rect
		x={LEFT}
		y={STRENGTH_TOP}
		width={PLOT_WIDTH}
		height={STRENGTH_HEIGHT}
		rx="10"
		fill="var(--color-base-200)"
	/>
	<rect
		x={LEFT}
		y={DRIFT_TOP}
		width={PLOT_WIDTH}
		height={DRIFT_HEIGHT}
		rx="10"
		fill="var(--color-base-200)"
	/>
	<rect
		x={LEFT}
		y={LOAD_TOP}
		width={PLOT_WIDTH}
		height={LOAD_HEIGHT}
		rx="10"
		fill="var(--color-base-200)"
	/>

	{#each positioned as point (point.workout_id)}
		<line
			data-series="spine"
			data-workout-id={point.workout_id}
			x1={point.x}
			x2={point.x}
			y1={STRENGTH_TOP}
			y2={LOAD_TOP + LOAD_HEIGHT}
			stroke="var(--color-base-content)"
			stroke-opacity="0.08"
			vector-effect="non-scaling-stroke"
		/>
	{/each}

	{#if estimatePath}
		<path
			data-series="estimate"
			d={estimatePath}
			fill="none"
			stroke="var(--color-base-content)"
			stroke-width="3"
			stroke-linecap="round"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>
	{/if}

	{#if trainingMaxPath}
		<path
			data-series="training-max"
			d={trainingMaxPath}
			fill="none"
			stroke="var(--color-info)"
			stroke-width="2"
			stroke-dasharray="5 5"
			stroke-linecap="round"
			stroke-linejoin="round"
			vector-effect="non-scaling-stroke"
		/>
	{/if}

	{#each positioned as point (point.workout_id)}
		{#if finite(point.estimate)}
			<circle
				data-series="estimate-point"
				data-workout-id={point.workout_id}
				cx={point.x}
				cy={strengthY(point.estimate)}
				r="4"
				fill="var(--color-base-content)"
				stroke="var(--color-base-100)"
				stroke-width="2"
				vector-effect="non-scaling-stroke"
			/>
		{/if}
	{/each}

	<g data-panel="drift">
		<line
			data-series="drift-zero"
			x1={LEFT}
			x2={LEFT + PLOT_WIDTH}
			y1={driftZero}
			y2={driftZero}
			stroke="var(--color-base-content)"
			stroke-opacity="0.28"
			vector-effect="non-scaling-stroke"
		/>

		{#each positioned as point (point.workout_id)}
			{@const drift = finite(point.drift_kg) ? point.drift_kg : 0}
			{@const y = driftY(drift)}
			{#if drift !== 0}
				<rect
					data-series="drift"
					data-workout-id={point.workout_id}
					x={point.x - markWidth / 2}
					y={Math.min(y, driftZero)}
					width={markWidth}
					height={Math.abs(driftZero - y)}
					rx={Math.min(3, markWidth / 2)}
					fill={drift > 0 ? 'var(--color-warning)' : 'var(--color-info)'}
				/>
			{/if}
		{/each}
	</g>

	<g data-panel="load" data-zero-y={LOAD_TOP + LOAD_HEIGHT}>
		{#each positioned as point (point.workout_id)}
			{#if finite(point.load_moved_kg) && point.load_moved_kg >= 0}
				{@const y = loadY(point.load_moved_kg)}
				<rect
					data-series="load"
					data-workout-id={point.workout_id}
					x={point.x - markWidth / 2}
					{y}
					width={markWidth}
					height={LOAD_TOP + LOAD_HEIGHT - y}
					rx={Math.min(3, markWidth / 2)}
					fill="var(--color-plate-15)"
					fill-opacity="0.72"
				/>
			{/if}
		{/each}
	</g>
</svg>
