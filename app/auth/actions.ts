"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  type AuthField,
  type AuthMode,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from "@/lib/auth-schemas";
import { toFieldErrors } from "@/lib/form-errors";

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, string>>;
  formError?: string;
  /** Echoed back so a rejected submit doesn't wipe the form. Never the password. */
  values?: { name?: string; email?: string };
};

type FormValues = AuthFormState["values"];

/**
 * Runs a better-auth call and turns its APIError into form state. better-auth's
 * messages are already enumeration-safe ("Invalid email or password"), so they
 * can be surfaced verbatim. Returns null on success.
 */
async function toFormError(
  call: () => Promise<unknown>,
  values: FormValues,
): Promise<AuthFormState | null> {
  try {
    await call();
    return null;
  } catch (error) {
    if (error instanceof APIError) {
      return {
        formError: error.body?.message ?? "Something went wrong. Try again.",
        values,
      };
    }
    throw error;
  }
}

/**
 * `mode` is bound by the form rather than read from FormData, so it can't be
 * swapped by a hand-crafted POST.
 */
export async function authenticate(
  mode: AuthMode,
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let failure: AuthFormState | null;

  if (mode === "signup") {
    const values = { name, email };
    const parsed = signUpSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      return { fieldErrors: toFieldErrors<AuthField>(parsed.error), values };
    }
    failure = await toFormError(
      () => auth.api.signUpEmail({ body: parsed.data }),
      values,
    );
  } else {
    const values = { email };
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      return { fieldErrors: toFieldErrors<AuthField>(parsed.error), values };
    }
    failure = await toFormError(
      () => auth.api.signInEmail({ body: parsed.data }),
      values,
    );
  }

  if (failure) return failure;

  // Outside the try/catch above: redirect() signals by throwing, and catching
  // it would swallow the navigation.
  redirect(safeRedirectPath(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/auth");
}
