import Link from 'next/link';
import { signOutAction } from '@/app/auth/actions';
import { getSession } from '@/lib/auth';

export async function Header() {
  const session = await getSession();

  return (
    <header className='sticky top-0 z-10 border-b border-border bg-background/75 backdrop-blur-md'>
      <nav
        aria-label='Main'
        className='mx-auto flex max-w-3xl items-center gap-4 px-6 py-4 text-sm'
      >
        <Link
          href='/dashboard'
          className='flex items-center gap-2 rounded-sm font-display text-xl font-medium tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4'
        >
          <span
            aria-hidden
            className='size-2.5 rotate-45 rounded-[3px] bg-linear-to-br from-primary to-fuchsia-400 shadow-sm shadow-primary/40'
          />
          NextNotes
        </Link>
        {session ? (
          <div className='ml-auto flex items-center gap-4'>
            <span className='hidden opacity-70 sm:inline'>{session.user.email}</span>
            <form action={signOutAction}>
              <button
                type='submit'
                className='btn-secondary'
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link href='/auth' className='btn-primary ml-auto px-3 py-1.5'>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
