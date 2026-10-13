import { APIError } from 'better-auth/api';

export type AuthFormValues = { name?: string; email?: string };

/**
 * better-auth's sign-in errors are already enumeration-safe ("Invalid email or
 * password"). Sign-up's "User already exists" is not, so it is made vague here;
 * success vs. failure still differs, which only email verification would close.
 */
const MESSAGE_OVERRIDES: Record<string, string> = {
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Couldn't create an account with those details.",
};

/**
 * Runs a better-auth call and turns its APIError into form state. Returns null
 * on success; anything that isn't an APIError is rethrown.
 */
export async function toFormError(
  call: () => Promise<unknown>,
  values: AuthFormValues,
): Promise<{ formError: string; values: AuthFormValues } | null> {
  try {
    await call();
    return null;
  } catch (error) {
    if (error instanceof APIError) {
      const code = error.body?.code;
      return {
        formError:
          (code && MESSAGE_OVERRIDES[code]) ??
          error.body?.message ??
          'Something went wrong. Try again.',
        values,
      };
    }
    throw error;
  }
}
