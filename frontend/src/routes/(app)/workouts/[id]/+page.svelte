<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { commitEditableSession } from '$lib/session';
	import { loadActiveSession, saveActiveSession, setActiveAthlete } from '$lib/storage';
	import { uuidv7 } from '$lib/uuid';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let active = $state(false);
	let checking = $state(true);
	let busy = $state(false);
	let message = $state('');
	let copied = $state(false);

	$effect(() => {
		void setActiveAthlete(data.session.athlete_id, data.enrollmentIds)
			.then(loadActiveSession)
			.then((session) => {
				active = session !== null;
			})
			.catch(() => {
				message = 'Could not read training saved on this device.';
			})
			.finally(() => {
				checking = false;
			});
	});

	async function start(editFirst = false) {
		if (busy || active || checking) return;
		busy = true;
		message = '';
		try {
			await saveActiveSession(
				commitEditableSession(data.session, {
					id: uuidv7(),
					startedAt: editFirst ? '' : new Date().toISOString()
				})
			);
			await goto(resolve('/session'));
		} catch (error) {
			message =
				error instanceof Error
					? error.message
					: 'Could not save this session on your device. Please try again.';
		} finally {
			busy = false;
		}
	}

	async function copyLink() {
		if (!form?.shareUrl) return;
		try {
			await navigator.clipboard.writeText(form.shareUrl);
			copied = true;
		} catch {
			message = 'Select and copy the link below.';
		}
	}
</script>

<svelte:head
	><title>{data.workout.title} · AthletOS</title><meta
		name="referrer"
		content="strict-origin"
	/></svelte:head
>
<a class="link text-sm" href={resolve('/workouts')}>My workouts</a>
<h1 class="mt-3 text-2xl font-bold">{data.workout.title}</h1>
{#if data.workout.description}<p class="mt-2 whitespace-pre-wrap opacity-70">
		{data.workout.description}
	</p>{/if}
{#if form?.message}<p class="mt-3 alert" role="status">{form.message}</p>{/if}
{#if message}<p class="mt-3 alert alert-error" role="alert">{message}</p>{/if}

<div class="my-4 space-y-2">
	{#if active}
		<a class="btn w-full btn-primary" href={resolve('/session')}>Resume session</a>
		<p class="text-sm opacity-70">Finish your current session before starting another.</p>
	{:else}
		<button
			class="btn w-full btn-lg btn-primary"
			type="button"
			disabled={busy || checking || data.workout.archived}
			onclick={() => start()}>Start workout</button
		>
		<button
			class="btn w-full"
			type="button"
			disabled={busy || checking || data.workout.archived}
			onclick={() => start(true)}>Edit this session</button
		>
	{/if}
	<p class="text-sm opacity-70">
		Changes during training affect this session. Your saved workout stays available for next time.
	</p>
</div>

{#each [...new Set(data.session.sets.map((set) => set.block_id))] as blockId (blockId)}
	{@const sets = data.session.sets.filter((set) => set.block_id === blockId)}
	<section class="card mb-3 border">
		<div class="card-body">
			<h2 class="card-title">{sets[0].label}</h2>
			<ul>
				{#each sets as set (set.id)}<li>
						{set.prescribed_reps}{set.amrap ? '+' : ''} reps · {set.prescribed_weight > 0
							? `${set.prescribed_weight} kg`
							: 'Bodyweight'}
					</li>{/each}
			</ul>
		</div>
	</section>
{/each}

<div class="my-4 flex flex-wrap gap-2">
	<a class="btn" href={resolve(`/workouts/${data.workout.id}/edit`)}>Edit saved workout</a>
	<form method="POST" action="?/duplicate" use:enhance>
		<input type="hidden" name="revision" value={data.workout.revision} /><button
			class="btn"
			type="submit">Duplicate</button
		>
	</form>
</div>

<section class="mt-6 border-t border-base-300 pt-4">
	<h2 class="font-bold">Share workout</h2>
	<p class="my-2 text-sm opacity-70">
		Anyone with the link can see this version, including its weights, and save their own copy.
		Future edits are not shared automatically.
	</p>
	<form method="POST" action="?/share" use:enhance>
		<input type="hidden" name="revision" value={data.workout.revision} /><button
			class="btn"
			type="submit"
			disabled={data.workout.archived}>Create share link</button
		>
	</form>
	{#if form?.shareUrl}
		<div class="my-3 space-y-2">
			<label class="block"
				><span class="label">Share link</span><input
					class="input w-full"
					readonly
					value={form.shareUrl}
				/></label
			><button class="btn btn-sm" type="button" onclick={copyLink}
				>{copied ? 'Copied' : 'Copy link'}</button
			>
		</div>
	{/if}
	<ul class="mt-3 space-y-2">
		{#each data.shares.filter((share) => !share.revoked_at) as share (share.id)}<li
				class="flex items-center justify-between gap-2 text-sm"
			>
				<span>Version {share.revision} · {share.created_at.slice(0, 10)}</span>
				<form method="POST" action="?/revoke" use:enhance>
					<input type="hidden" name="share_id" value={share.id} /><button
						class="btn btn-ghost btn-sm"
						type="submit">Revoke link</button
					>
				</form>
			</li>{/each}
	</ul>
</section>

<details class="mt-6 border-t border-base-300 pt-4">
	<summary class="cursor-pointer text-sm">Archive workout</summary>
	<p class="my-2 text-sm opacity-70">
		Remove it from My workouts and revoke its share links. Saved copies and training history are
		kept.
	</p>
	<form method="POST" action="?/archive" use:enhance>
		<button class="btn btn-outline" type="submit">Archive workout</button>
	</form>
</details>
