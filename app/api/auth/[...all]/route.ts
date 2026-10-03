import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

// Path is fixed by better-auth's default basePath of /api/auth.
// Never set `runtime = "edge"` here — bun:sqlite only exists in the Bun runtime.
export const { GET, POST } = toNextJsHandler(auth.handler);
