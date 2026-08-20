import { createAuthClient } from "better-auth/react";

// No baseURL needed: the client and /api/auth are on the same origin, so
// better-auth infers it from window.location.origin.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
