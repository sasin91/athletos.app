<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Sign in · AthletOS</title></svelte:head>

<main class="mx-auto max-w-sm space-y-4 p-4">
	<h1 class="text-2xl font-bold">AthletOS</h1>

	{#if form?.message}
		<p class="alert alert-error" role="alert">{form.message}</p>
	{/if}

	<form method="POST" class="space-y-3">
		<label class="form-control block">
			<span class="label-text">Email</span>
			<input
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
				class="input-bordered input w-full"
			/>
		</label>

		<label class="form-control block">
			<span class="label-text">Password</span>
			<input
				name="password"
				type="password"
				autocomplete="current-password"
				required
				class="input-bordered input w-full"
			/>
		</label>

		<button class="btn w-full btn-primary" type="submit">Sign in</button>
	</form>

	<p class="text-sm">
		No account? <a class="link" href={resolve('/register')}>Register</a>
	</p>
</main>
