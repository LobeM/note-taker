import { APIError } from 'better-auth/api';
import { describe, expect, it } from 'vitest';
import { toFormError } from '@/lib/auth-errors';

const values = { email: 'ada@example.com' };

describe('toFormError', () => {
  it('returns null when the call succeeds', async () => {
    await expect(toFormError(async () => ({ ok: true }), values)).resolves.toBeNull();
  });

  it("uses better-auth's message for an APIError", async () => {
    const error = new APIError('UNAUTHORIZED', { message: 'Invalid email or password' });
    await expect(toFormError(() => Promise.reject(error), values)).resolves.toEqual({
      formError: 'Invalid email or password',
      values,
    });
  });

  it('replaces the account-enumerating duplicate-user message', async () => {
    const error = new APIError('UNPROCESSABLE_ENTITY', {
      code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
      message: 'User already exists. Use another email.',
    });
    const result = await toFormError(() => Promise.reject(error), values);
    expect(result?.formError).toBe("Couldn't create an account with those details.");
  });

  it('falls back to a generic message when the APIError has none', async () => {
    const error = new APIError('INTERNAL_SERVER_ERROR');
    const result = await toFormError(() => Promise.reject(error), values);
    expect(result?.formError).toBeTruthy();
    expect(result?.formError).not.toMatch(/undefined/);
  });

  it('rethrows anything that is not an APIError', async () => {
    const error = new Error('database down');
    await expect(toFormError(() => Promise.reject(error), values)).rejects.toBe(error);
  });
});
