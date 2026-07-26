<script lang="ts">
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head><title>Register · AthletOS</title></svelte:head>

<main class="mx-auto max-w-sm space-y-4 p-4">
	<h1 class="text-2xl font-bold">Register</h1>

	{#if form?.message}
		<p class="alert alert-error" role="alert">{form.message}</p>
	{/if}

	<form method="POST" class="space-y-3">
		<label class="form-control block">
			<span class="label-text">Name</span>
			<input
				name="display_name"
				autocomplete="name"
				required
				value={form?.displayName ?? ''}
				class="input-bordered input w-full"
			/>
		</label>

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
				autocomplete="new-password"
				required
				class="input-bordered input w-full"
			/>
			<span class="label-text-alt">
				There is no password reset in v1. Keep this somewhere you can find it.
			</span>
		</label>

		<button class="btn w-full btn-primary" type="submit">Create account</button>
	</form>

	<p class="text-sm">
		Already registered? <a class="link" href={resolve('/login')}>Sign in</a>
	</p>
</main>
