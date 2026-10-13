import { vi } from 'vitest';

/** Override per test with `vi.mocked(headers).mockResolvedValue(new Headers({...}))`. */
export const headers = vi.fn(async () => new Headers());
