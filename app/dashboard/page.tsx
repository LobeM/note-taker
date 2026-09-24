import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_REDIRECT } from "@/lib/auth-schemas";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(DEFAULT_REDIRECT)}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <Link
          href="/notes/new"
          className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          New note
        </Link>
      </div>
      <p className="mt-2 text-sm opacity-70">Signed in as {user.email}.</p>
    </div>
  );
}
