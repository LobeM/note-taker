import { APIError } from 'better-auth/api';
import { headers } from 'next/headers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authenticate, signOutAction } from '@/app/auth/actions';
import { auth } from '@/lib/auth';
import { resetDb } from '@/test/db';

vi.mock('next/headers');
vi.mock('next/navigation');
vi.mock('@/lib/auth');

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const signIn = { email: 'ada@example.com', password: 'hunter22' };
const signUp = { name: 'Ada', email: 'ada@example.com', password: 'longenough' };
const requestHeaders = new Headers({ 'x-forwarded-for': '203.0.113.7' });

beforeEach(() => {
  resetDb();
  vi.mocked(headers).mockResolvedValue(requestHeaders as never);
});

describe('authenticate: sign in', () => {
  it('signs in with the request headers and redirects to the sanitized next', async () => {
    await expect(
      authenticate('signin', {}, form({ ...signIn, next: '/notes/abc' })),
    ).rejects.toMatchObject({ url: '/notes/abc' });

    expect(auth.api.signInEmail).toHaveBeenCalledWith({ body: signIn, headers: requestHeaders });
  });

  it('never redirects off-site', async () => {
    await expect(
      authenticate('signin', {}, form({ ...signIn, next: '//evil.com' })),
    ).rejects.toMatchObject({ url: '/dashboard' });
  });

  it('returns field errors without calling better-auth', async () => {
    const state = await authenticate('signin', {}, form({ email: 'nope', password: '' }));

    expect(state).toEqual({
      fieldErrors: { email: 'Enter a valid email address', password: 'Password is required' },
      values: { email: 'nope' },
    });
    expect(auth.api.signInEmail).not.toHaveBeenCalled();
  });

  it("returns better-auth's error and never echoes the password", async () => {
    vi.mocked(auth.api.signInEmail).mockRejectedValueOnce(
      new APIError('UNAUTHORIZED', { message: 'Invalid email or password' }),
    );

    const state = await authenticate('signin', {}, form(signIn));

    expect(state).toEqual({
      formError: 'Invalid email or password',
      values: { email: signIn.email },
    });
    expect(JSON.stringify(state)).not.toContain(signIn.password);
  });

  it('limits attempts per email, whatever the claimed IP', async () => {
    for (let i = 0; i < 5; i++) {
      vi.mocked(headers).mockResolvedValueOnce(
        new Headers({ 'x-forwarded-for': `10.0.0.${i}` }) as never,
      );
      await authenticate('signin', {}, form(signIn)).catch(() => {});
    }

    // Case doesn't open a fresh bucket.
    const state = await authenticate('signin', {}, form({ ...signIn, email: 'ADA@example.com' }));

    expect(state.formError).toMatch(/Too many attempts/);
    expect(auth.api.signInEmail).toHaveBeenCalledTimes(5);
  });
});

describe('authenticate: sign up', () => {
  it('creates the account and redirects', async () => {
    await expect(authenticate('signup', {}, form(signUp))).rejects.toMatchObject({
      url: '/dashboard',
    });
    expect(auth.api.signUpEmail).toHaveBeenCalledWith({ body: signUp, headers: requestHeaders });
  });

  it('hides whether the email is already registered', async () => {
    vi.mocked(auth.api.signUpEmail).mockRejectedValueOnce(
      new APIError('UNPROCESSABLE_ENTITY', {
        code: 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
        message: 'User already exists. Use another email.',
      }),
    );

    const state = await authenticate('signup', {}, form(signUp));

    expect(state).toEqual({
      formError: "Couldn't create an account with those details.",
      values: { name: 'Ada', email: signUp.email },
    });
  });

  it('validates before spending a rate-limit slot', async () => {
    for (let i = 0; i < 10; i++) {
      await authenticate('signup', {}, form({ ...signUp, password: 'short' }));
    }
    await expect(authenticate('signup', {}, form(signUp))).rejects.toMatchObject({
      url: '/dashboard',
    });
  });

  it('limits sign-ups per IP', async () => {
    for (let i = 0; i < 5; i++) await authenticate('signup', {}, form(signUp)).catch(() => {});

    const state = await authenticate('signup', {}, form(signUp));

    expect(state.formError).toMatch(/Too many attempts/);
    expect(auth.api.signUpEmail).toHaveBeenCalledTimes(5);
  });
});

describe('authenticate: mode', () => {
  it('treats a tampered mode as sign in', async () => {
    await authenticate('admin' as never, {}, form(signIn)).catch(() => {});
    expect(auth.api.signInEmail).toHaveBeenCalled();
    expect(auth.api.signUpEmail).not.toHaveBeenCalled();
  });
});

describe('signOutAction', () => {
  it('signs out with the request headers and redirects to /auth', async () => {
    await expect(signOutAction()).rejects.toMatchObject({ url: '/auth' });
    expect(auth.api.signOut).toHaveBeenCalledWith({ headers: requestHeaders });
  });
});
