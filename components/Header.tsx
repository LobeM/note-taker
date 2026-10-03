import Link from 'next/link';
import { signOutAction } from '@/app/auth/actions';
import { getSession } from '@/lib/auth';

export async function Header() {
  const session = await getSession();

  return (
    <header className='border-b border-black/10 dark:border-white/15'>
      <nav
        aria-label='Main'
        className='mx-auto flex max-w-3xl items-center gap-4 px-6 py-6 text-sm'
      >
        <Link
          href='/dashboard'
          className='rounded-sm text-base font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4'
        >
          NextNotes
        </Link>
        {session ? (
          <div className='ml-auto flex items-center gap-4'>
            <span className='hidden opacity-70 sm:inline'>{session.user.email}</span>
            <form action={signOutAction}>
              <button
                type='submit'
                className='opacity-70 underline-offset-4 hover:underline hover:opacity-100'
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <Link href='/auth' className='ml-auto opacity-70 hover:opacity-100'>
            Sign in
          </Link>
        )}
      </nav>
    </header>
  );
}
