import { vi } from 'vitest';

// Stands in for lib/auth.ts so tests never load better-auth. Types still come
// from the real module, so `vi.mocked(...)` calls are checked against it.

export const auth = {
  api: {
    signInEmail: vi.fn(async () => ({})),
    signUpEmail: vi.fn(async () => ({})),
    signOut: vi.fn(async () => ({})),
  },
};

export const getSession = vi.fn(async () => null);

export const getCurrentUser = vi.fn(async () => null);
