"use client";

import { useActionState } from "react";
import { authenticate, type AuthFormState } from "@/app/auth/actions";
import {
  type AuthField,
  type AuthMode,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth-schemas";

type AuthFormProps = {
  mode: AuthMode;
  /** Already sanitized by the page; re-checked server-side regardless. */
  next: string;
};

const INITIAL_STATE: AuthFormState = {};

const inputClassName =
  "mt-1.5 w-full rounded-md border border-black/15 px-3 py-2 text-sm outline-none " +
  "focus-visible:border-black/40 aria-invalid:border-red-500 " +
  "dark:border-white/20 dark:focus-visible:border-white/50";

export function AuthForm({ mode, next }: AuthFormProps) {
  const isSignUp = mode === "signup";
  const [state, formAction, pending] = useActionState(
    authenticate.bind(null, mode),
    INITIAL_STATE,
  );

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      {state.formError ? (
        <p
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {state.formError}
        </p>
      ) : null}

      <fieldset
        disabled={pending}
        className="flex flex-col gap-5 disabled:opacity-60"
      >
        {isSignUp ? (
          <Field field="name" label="Name" error={state.fieldErrors?.name}>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              autoFocus
              defaultValue={state.values?.name}
              aria-invalid={state.fieldErrors?.name ? true : undefined}
              aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
              className={inputClassName}
            />
          </Field>
        ) : null}

        <Field field="email" label="Email" error={state.fieldErrors?.email}>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus={!isSignUp}
            defaultValue={state.values?.email}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
            aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
            className={inputClassName}
          />
        </Field>

        <Field
          field="password"
          label="Password"
          error={state.fieldErrors?.password}
          hint={isSignUp ? `At least ${PASSWORD_MIN_LENGTH} characters.` : undefined}
        >
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={isSignUp ? PASSWORD_MIN_LENGTH : undefined}
            maxLength={128}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            aria-invalid={state.fieldErrors?.password ? true : undefined}
            aria-describedby={
              state.fieldErrors?.password
                ? "password-error"
                : isSignUp
                  ? "password-hint"
                  : undefined
            }
            className={inputClassName}
          />
        </Field>

        <button
          type="submit"
          aria-busy={pending}
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {pending
            ? isSignUp
              ? "Creating account…"
              : "Signing in…"
            : isSignUp
              ? "Create account"
              : "Sign in"}
        </button>
      </fieldset>
    </form>
  );
}

type FieldProps = {
  field: AuthField;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
};

function Field({ field, label, error, hint, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={field} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${field}-error`} className="mt-1.5 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${field}-hint`} className="mt-1.5 text-sm opacity-70">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
