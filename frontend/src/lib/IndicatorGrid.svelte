<script lang="ts">
	import type { components } from './api/schema';
	import { formatElapsed } from './time';

	type Indicator = components['schemas']['Indicator'];

	let { indicators }: { indicators: Indicator[] } = $props();

	/**
	 * Deliberately narrower than the wire contract. Medians remain available to
	 * older screens, but this dashboard answers with the requested spread and
	 * must not silently grow a ninth cell when the API gains another metric.
	 */
	const ORDER = [
		'sessions',
		'load_moved',
		'average_duration',
		'interval_min',
		'interval_average',
		'interval_max',
		'sets_over',
		'sets_under'
	] as const;

	const visible = $derived(
		ORDER.flatMap((key) => {
			const indicator = indicators.find((candidate) => candidate.key === key);
			return indicator ? [indicator] : [];
		})
	);

	const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
	const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

	function display(indicator: Indicator): string {
		if (!Number.isFinite(indicator.value)) return '—';

		switch (indicator.unit) {
			case 'kg':
				return `${decimal.format(indicator.value)} kg`;
			case 'seconds':
				return formatElapsed(indicator.value * 1000);
			case 'count':
				return integer.format(indicator.value);
		}
	}
</script>

<!--
	A ledger rather than a tray of metric cards. The chart spends the screen's
	visual emphasis; these facts share one quiet rule and use tabular Barlow so
	the values can be scanned without competing with today's training action.
-->
<dl class="grid grid-cols-2 border-t border-base-300">
	{#each visible as indicator (indicator.key)}
		<div class="border-b border-base-300 py-3 odd:pr-3 even:border-l even:pl-3">
			<dt class="text-xs leading-tight opacity-50">{indicator.label}</dt>
			<dd class="mt-1 text-lg leading-none font-medium tabular">{display(indicator)}</dd>
		</div>
	{/each}
</dl>
