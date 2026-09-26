import { z } from "zod";

/**
 * The two states of /auth. The mode lives in the URL (`?mode=signup`) rather
 * than in component state so it is linkable and survives the back button.
 */
export type AuthMode = "signin" | "signup";

export function parseMode(value: unknown): AuthMode {
  return value === "signup" ? "signup" : "signin";
}

export const DEFAULT_REDIRECT = "/dashboard";

const SENTINEL_ORIGIN = "http://sentinel.invalid";

/**
 * `?next=` is attacker-controllable, so only same-origin *paths* survive.
 * Prefix checks aren't enough: browsers strip tabs/newlines and treat "\" as
 * "/", so "/\t/evil.com" becomes "//evil.com". Resolving against a sentinel
 * origin with the same URL parser the browser uses catches every such variant.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return DEFAULT_REDIRECT;
  try {
    const url = new URL(value, SENTINEL_ORIGIN);
    if (url.origin !== SENTINEL_ORIGIN) return DEFAULT_REDIRECT;
    // Normalized, so control characters never reach the Location header.
    return url.pathname + url.search + url.hash;
  } catch {
    return DEFAULT_REDIRECT;
  }
}

export const signInSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// 8 characters is better-auth's own default minimum, so the inline error and
// the server's rejection agree instead of contradicting each other.
export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  email: z.email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(128, "Password is too long"),
});

export const PASSWORD_MIN_LENGTH = 8;

export type AuthField = "name" | "email" | "password";
