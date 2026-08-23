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
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm opacity-70">
        Signed in as {user.email}. The note list and the &ldquo;Create
        note&rdquo; button go here.
      </p>
    </div>
  );
}
