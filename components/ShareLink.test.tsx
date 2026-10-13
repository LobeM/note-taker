import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShareLink } from '@/components/ShareLink';

const url = `${window.location.origin}/p/abc123`;

afterEach(() => vi.useRealTimers());

async function clickCopy() {
  // fireEvent + act keeps this compatible with fake timers.
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
  });
}

describe('ShareLink', () => {
  it('shows the absolute public URL and an Open link to the path', () => {
    render(<ShareLink slug='abc123' />);

    expect(screen.getByLabelText('Public link')).toHaveProperty('value', url);
    const open = screen.getByRole('link', { name: 'Open' });
    expect(open.getAttribute('href')).toBe('/p/abc123');
    expect(open.getAttribute('target')).toBe('_blank');
  });

  it('copies the URL, confirms, then clears the message after 2s', async () => {
    vi.useFakeTimers();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
    render(<ShareLink slug='abc123' />);

    await clickCopy();

    expect(writeText).toHaveBeenCalledWith(url);
    expect(screen.getByText('Link copied.')).toBeTruthy();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.queryByText('Link copied.')).toBeNull();
  });

  it('tells the user to copy manually when the clipboard is unavailable', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<ShareLink slug='abc123' />);

    await clickCopy();

    expect(screen.getByText(/Couldn’t copy/)).toBeTruthy();
  });
});
