import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { getSession } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Notes",
    template: "%s · Notes",
  },
  description: "Write, edit, and share rich-text notes.",
};

// Reading the session here makes every route dynamic. Acceptable for now; if
// static rendering of /p/[slug] starts to matter, move this into a <UserNav />
// wrapped in <Suspense>.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <nav className="mx-auto flex max-w-2xl items-center gap-4 px-6 py-4 text-sm">
            <Link href="/" className="font-semibold">
              Notes
            </Link>
            <Link href="/dashboard" className="opacity-70 hover:opacity-100">
              Dashboard
            </Link>
            {session ? (
              <div className="ml-auto flex items-center gap-4">
                <span className="opacity-70">{session.user.email}</span>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="opacity-70 hover:opacity-100 hover:underline underline-offset-4"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : (
              <Link
                href="/auth"
                className="ml-auto opacity-70 hover:opacity-100"
              >
                Sign in
              </Link>
            )}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
