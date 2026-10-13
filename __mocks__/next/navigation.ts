import { vi } from 'vitest';

/** Next signals navigation by throwing; so do these, carrying what a test asserts on. */
export class RedirectError extends Error {
  constructor(readonly url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

export class NotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND');
  }
}

export const redirect = vi.fn((url: string): never => {
  throw new RedirectError(url);
});

export const notFound = vi.fn((): never => {
  throw new NotFoundError();
});
