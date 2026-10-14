'use client';

import { useId, useState, useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

type ShareLinkProps = { slug: string };

export function ShareLink({ slug }: ShareLinkProps) {
  const path = `/p/${slug}`;
  // The origin only exists in the browser; the server renders the bare path,
  // so hydration matches and we never trust a client-supplied Host header.
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => '',
  );
  const url = origin + path;
  const inputId = useId();
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  async function copy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
    setTimeout(() => setStatus('idle'), 2000);
  }

  return (
    <div className='mt-4'>
      <label htmlFor={inputId} className='text-sm font-medium'>
        Public link
      </label>
      <div className='mt-1.5 flex gap-2'>
        <input
          id={inputId}
          type='text'
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className='text-field min-w-0 flex-1 py-1.5 font-mono text-sm'
        />
        <button
          type='button'
          onClick={copy}
          className='btn-secondary'
        >
          Copy
        </button>
        <a
          href={path}
          target='_blank'
          rel='noopener'
          className='rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2'
        >
          Open
        </a>
      </div>
      <p aria-live='polite' className='mt-1 min-h-5 text-xs opacity-70'>
        {status === 'copied'
          ? 'Link copied.'
          : status === 'failed'
            ? 'Couldn’t copy; select the link and copy it manually.'
            : ''}
      </p>
    </div>
  );
}
