import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { NoteForm } from '@/components/NoteForm';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = { title: 'New note' };

export default async function NewNotePage() {
  if (!(await getCurrentUser())) redirect('/auth?next=/notes/new');

  return (
    <div className='mx-auto max-w-3xl px-6 py-12'>
      <h1 className='text-3xl font-semibold tracking-tight'>New note</h1>
      <NoteForm />
    </div>
  );
}
