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

/**
 * `?next=` is attacker-controllable, so only same-origin *paths* survive.
 * "//evil.com" and "/\evil.com" are protocol-relative URLs that browsers
 * happily follow off-site, hence the second character check.
 */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_REDIRECT;
  if (!value.startsWith("/")) return DEFAULT_REDIRECT;
  if (value.startsWith("//") || value.startsWith("/\\")) return DEFAULT_REDIRECT;
  return value;
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
