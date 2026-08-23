import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSession } from "@/lib/auth";
import {
  type AuthMode,
  DEFAULT_REDIRECT,
  parseMode,
  safeRedirectPath,
} from "@/lib/auth-schemas";

export async function generateMetadata({
  searchParams,
}: PageProps<"/auth">): Promise<Metadata> {
  const { mode } = await searchParams;
  return { title: parseMode(mode) === "signup" ? "Create account" : "Sign in" };
}

/** Keeps `?next=` across the sign in / sign up toggle. */
function authHref(mode: AuthMode, next: string): string {
  const params = new URLSearchParams();
  if (mode === "signup") params.set("mode", "signup");
  if (next !== DEFAULT_REDIRECT) params.set("next", next);
  const query = params.toString();
  return query ? `/auth?${query}` : "/auth";
}

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const { mode, next } = await searchParams;
  const target = safeRedirectPath(next);

  if (await getSession()) redirect(target);

  const authMode = parseMode(mode);
  const isSignUp = authMode === "signup";

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-3xl font-semibold">
        {isSignUp ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm opacity-70">
        {isSignUp
          ? "Email and password is all we need."
          : "Welcome back. Enter your email and password."}
      </p>

      {/* `key` remounts the form so a failed submit in one mode doesn't leave
          its errors sitting on the other. */}
      <AuthForm key={authMode} mode={authMode} next={target} />

      <p className="mt-6 text-sm opacity-70">
        {isSignUp ? "Already have an account? " : "Don't have an account? "}
        <Link
          href={authHref(isSignUp ? "signin" : "signup", target)}
          className="font-medium underline underline-offset-4 opacity-100"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </Link>
      </p>
    </div>
  );
}
