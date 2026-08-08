<script lang="ts">
	import { chartPoints, selectLift, type ProgressView } from '$lib/dashboard';
	import IndicatorGrid from '$lib/IndicatorGrid.svelte';
	import ProgressChart from '$lib/ProgressChart.svelte';

	type Enrollment = { id: string; program_name: string };

	let {
		progress,
		enrollments,
		requestedLift
	}: {
		progress: ProgressView | null;
		enrollments: Enrollment[];
		requestedLift: string | null;
	} = $props();

	const selectedLift = $derived(progress ? selectLift(progress, requestedLift) : null);
	const selectedPoints = $derived(selectedLift ? chartPoints(selectedLift) : []);
	const latestPoint = $derived(selectedPoints.at(-1) ?? null);
	const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

	function kilograms(value: number | null | undefined): string {
		return typeof value === 'number' && Number.isFinite(value)
			? `${decimal.format(value)} kg`
			: '—';
	}

	function signedKilograms(value: number): string {
		return `${value > 0 ? '+' : ''}${decimal.format(value)} kg`;
	}

	function hasObservations(indicators: { key: string; value: number }[]): boolean {
		return (indicators.find((indicator) => indicator.key === 'sessions')?.value ?? 0) > 0;
	}
</script>

<section class="mt-8" aria-labelledby="progress-title">
	{#if progress === null}
		<h2 id="progress-title" class="eyebrow">Progress</h2>
		<p class="mt-2 text-sm opacity-70">Statistics unavailable.</p>
	{:else}
		<div class="mb-4 flex items-end justify-between gap-4">
			<div>
				<p class="eyebrow">Last {progress.window_months} months</p>
				<h2 id="progress-title" class="mt-1 text-xl font-bold">
					{selectedLift ? `${selectedLift.label} progress` : 'Progress'}
				</h2>
			</div>

			{#if progress.lifts.length > 0}
				<form method="GET">
					<label class="sr-only" for="progress-lift">Lift</label>
					<select
						id="progress-lift"
						name="lift"
						class="select border-base-300 bg-base-200 select-sm"
						onchange={(event) => event.currentTarget.form?.requestSubmit()}
					>
						{#each progress.lifts as lift (lift.exercise)}
							<option value={lift.exercise} selected={lift.exercise === selectedLift?.exercise}>
								{lift.label}
							</option>
						{/each}
					</select>
				</form>
			{/if}
		</div>

		{#if selectedLift}
			<div class="border-y border-base-300 py-4">
				<div class="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
					<div>
						<p class="text-xs opacity-50">Estimated strength</p>
						<p class="mt-1 font-medium tabular">{kilograms(latestPoint?.estimate)}</p>
					</div>
					<div>
						<p class="text-xs opacity-50">
							{latestPoint?.training_max_label ?? 'Training max'}
						</p>
						<p class="mt-1 font-medium tabular">{kilograms(latestPoint?.training_max)}</p>
					</div>
					<div>
						<p class="text-xs opacity-50">Drift from prescription</p>
						<p class="mt-1 font-medium tabular">{kilograms(latestPoint?.drift_kg)}</p>
					</div>
					<div>
						<p class="text-xs opacity-50">Load moved</p>
						<p class="mt-1 font-medium tabular">{kilograms(latestPoint?.load_moved_kg)}</p>
					</div>
				</div>

				{#if selectedLift.estimate_change}
					<p class="mt-4 text-sm">
						<span class="opacity-60">Estimate change</span>
						<strong class="ml-2 tabular">
							{signedKilograms(
								selectedLift.estimate_change.kg
							)}{#if selectedLift.estimate_change.percent !== null && selectedLift.estimate_change.percent !== undefined}
								({selectedLift.estimate_change.percent > 0 ? '+' : ''}{decimal.format(
									selectedLift.estimate_change.percent
								)}%)
							{/if}
						</strong>
					</p>
				{/if}

				<div
					class="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs opacity-65"
					aria-label="Chart legend"
				>
					<span>Solid — estimated strength</span>
					<span>Dashed — program max</span>
					<span>Band — drift</span>
					<span>Bars — load moved</span>
				</div>

				<div class="mt-3 overflow-x-auto">
					<ProgressChart label={selectedLift.label} points={selectedPoints} />
				</div>
			</div>
		{:else}
			<p class="border-y border-base-300 py-4 text-sm opacity-70">
				No lift observations in this period.
			</p>
		{/if}

		<div class="mt-6 space-y-2">
			{#each enrollments as enrollment (enrollment.id)}
				{@const statistics = progress.programs.find(
					(program) => program.enrollment_id === enrollment.id
				)}
				<details class="border-y border-base-300 py-3" data-enrollment-id={enrollment.id}>
					<summary class="cursor-pointer font-medium">
						{enrollment.program_name} statistics
					</summary>
					{#if statistics && hasObservations(statistics.indicators)}
						<div class="mt-3">
							<IndicatorGrid indicators={statistics.indicators} />
						</div>
					{:else}
						<p class="mt-3 text-sm opacity-60">No observations in this period.</p>
					{/if}
				</details>
			{/each}

			{#if hasObservations(progress.overall)}
				<details class="border-y border-base-300 py-3">
					<summary class="cursor-pointer font-medium">Overall</summary>
					<div class="mt-3">
						<IndicatorGrid indicators={progress.overall} />
					</div>
				</details>
			{/if}
		</div>
	{/if}
</section>
