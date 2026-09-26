import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getNoteById } from "@/lib/notes";

/**
 * Loads the signed-in user's note, or bounces to /auth (returning to `path`)
 * or 404s. Cached so generateMetadata and the page share one query.
 */
export const loadNote = cache(async (id: string, path: string) => {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(path)}`);
  // Scoped to the owner in SQL: someone else's note is indistinguishable from a missing one.
  return getNoteById(user.id, id) ?? notFound();
});
