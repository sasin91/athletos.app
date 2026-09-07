import { describe, expect, it, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

import { actions as editorActions } from './[id]/edit/+page.server';
import {
	actions as sharedActions,
	load as sharedLoad
} from '../../shared/workouts/[token]/+page.server';

const draft = {
	title: 'Pull day',
	description: 'Keep my changes',
	blocks: [{ exercise: 'squat', lifts: [{ sets: 3, reps: 5, weight: 62.5, amrap: false }] }]
};

function formRequest(fields: Record<string, string>) {
	const body = new FormData();
	for (const [name, value] of Object.entries(fields)) body.set(name, value);
	return new Request('https://athletos.app/workouts/owned/edit', { method: 'POST', body });
}

describe('workout editing conflicts', () => {
	it('retains the athlete draft and opened version after a concurrent save', async () => {
		const PATCH = vi.fn(async () => ({
			error: { detail: 'Revision conflict' },
			response: new Response(null, { status: 409 })
		}));
		const result = await editorActions.save({
			locals: { api: { PATCH } },
			params: { id: 'owned' },
			request: formRequest({ content: JSON.stringify(draft), expected_revision: '3' })
		} as never);
		expect(result).toMatchObject({
			status: 409,
			data: { draft, expectedRevision: 3, conflict: true }
		});
		expect(PATCH).toHaveBeenCalledWith('/v1/workout-definitions/{id}', {
			params: { path: { id: 'owned' } },
			body: { ...draft, expected_revision: 3 }
		});
	});

	it('saves the retained draft as a new owned workout without retrying the stale revision', async () => {
		const POST = vi.fn(async () => ({
			data: { id: 'new-copy' },
			response: new Response(null, { status: 201 })
		}));
		await expect(
			editorActions.copy({
				locals: { api: { POST } },
				request: formRequest({ content: JSON.stringify(draft) })
			} as never)
		).rejects.toMatchObject({ status: 303, location: '/workouts/new-copy' });
		expect(POST).toHaveBeenCalledWith('/v1/workout-definitions', { body: draft });
	});
});

describe('shared workout preview', () => {
	it('preserves the share destination through sign in without trying to copy anonymously', async () => {
		const POST = vi.fn();
		await expect(
			sharedActions.default({
				locals: { authenticated: false, api: { POST } },
				request: new Request('https://athletos.app/shared/workouts/opaque-token'),
				params: { token: 'opaque-token' },
				setHeaders: vi.fn()
			} as never)
		).rejects.toMatchObject({
			status: 303,
			location: '/login?from=%2Fshared%2Fworkouts%2Fopaque-token'
		});
		expect(POST).not.toHaveBeenCalled();
	});

	it('does not cache or send the public token as a referrer', async () => {
		const setHeaders = vi.fn();
		const preview = { ...draft, revision: 3, exercises: [] };
		const GET = vi.fn(async () => ({
			data: preview,
			response: new Response(null, { status: 200 })
		}));
		await expect(
			sharedLoad({
				locals: { authenticated: false, api: { GET } },
				params: { token: 'opaque-token' },
				setHeaders
			} as never)
		).resolves.toEqual({ workout: preview, authenticated: false });
		expect(setHeaders).toHaveBeenCalledWith(
			expect.objectContaining({
				'cache-control': 'private, no-store',
				'referrer-policy': 'strict-origin'
			})
		);
	});

	it('keeps a revoked copy request on the preview with its refusal', async () => {
		const POST = vi.fn(async () => ({
			error: { detail: 'This share link is no longer available.' },
			response: new Response(null, { status: 404 })
		}));
		const result = await sharedActions.default({
			locals: { authenticated: true, api: { POST } },
			request: new Request('https://athletos.app/shared/workouts/revoked-token'),
			params: { token: 'revoked-token' },
			setHeaders: vi.fn()
		} as never);
		expect(result).toMatchObject({
			status: 404,
			data: { message: 'This share link is no longer available.' }
		});
	});
});
