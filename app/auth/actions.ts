'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { type AuthFormValues, toFormError } from '@/lib/auth-errors';
import {
  type AuthField,
  type AuthMode,
  parseMode,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from '@/lib/auth-schemas';
import { toFieldErrors } from '@/lib/form-errors';
import { clientIp, consumeRateLimit, type RateLimitRule } from '@/lib/rate-limit';

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, string>>;
  formError?: string;
  /** Echoed back so a rejected submit doesn't wipe the form. Never the password. */
  values?: AuthFormValues;
};

const RATE_LIMITED = 'Too many attempts. Wait a minute and try again.';

// Sign-in is limited per email as well as per IP: the IP comes from a header a
// client can forge unless a proxy overwrites it, the email can't be dodged.
const SIGN_IN_PER_IP: RateLimitRule = { max: 20, windowSeconds: 60 };
const SIGN_IN_PER_EMAIL: RateLimitRule = { max: 5, windowSeconds: 60 };
const SIGN_UP_PER_IP: RateLimitRule = { max: 5, windowSeconds: 600 };

/**
 * `mode` is bound by the form, but bound arguments round-trip through the
 * client and can be replaced by a hand-crafted POST, so it is re-parsed here.
 * Both modes are public anyway; this only keeps the value well-formed.
 */
export async function authenticate(
  mode: AuthMode,
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get('name') ?? '');
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  // Forwarded so better-auth records the session's IP address and user agent.
  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);

  let failure: AuthFormState | null;

  if (parseMode(mode) === 'signup') {
    const values = { name, email };
    const parsed = signUpSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      return { fieldErrors: toFieldErrors<AuthField>(parsed.error), values };
    }
    if (!consumeRateLimit(`signup:ip:${ip}`, SIGN_UP_PER_IP)) {
      return { formError: RATE_LIMITED, values };
    }
    failure = await toFormError(
      () => auth.api.signUpEmail({ body: parsed.data, headers: requestHeaders }),
      values,
    );
  } else {
    const values = { email };
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      return { fieldErrors: toFieldErrors<AuthField>(parsed.error), values };
    }
    // Both buckets are always charged, so neither can be probed independently.
    const withinIpLimit = consumeRateLimit(`signin:ip:${ip}`, SIGN_IN_PER_IP);
    const withinEmailLimit = consumeRateLimit(
      `signin:email:${parsed.data.email.toLowerCase()}`,
      SIGN_IN_PER_EMAIL,
    );
    if (!withinIpLimit || !withinEmailLimit) {
      return { formError: RATE_LIMITED, values };
    }
    failure = await toFormError(
      () => auth.api.signInEmail({ body: parsed.data, headers: requestHeaders }),
      values,
    );
  }

  if (failure) return failure;

  // Outside the try/catch above: redirect() signals by throwing, and catching
  // it would swallow the navigation.
  redirect(safeRedirectPath(formData.get('next')));
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect('/auth');
}
