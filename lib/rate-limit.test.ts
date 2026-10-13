import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clientIp, consumeRateLimit } from '@/lib/rate-limit';
import { resetDb } from '@/test/db';

const rule = { max: 3, windowSeconds: 60 };

describe('consumeRateLimit', () => {
  beforeEach(() => {
    resetDb();
    vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
  });
  afterEach(() => vi.useRealTimers());

  it('allows up to max attempts in a window, then blocks', () => {
    const results = Array.from({ length: 5 }, () => consumeRateLimit('k', rule));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('keeps blocking until the window has fully elapsed, then starts a new one', () => {
    for (let i = 0; i < 4; i++) consumeRateLimit('k', rule);

    vi.advanceTimersByTime(59_999);
    expect(consumeRateLimit('k', rule)).toBe(false);

    vi.advanceTimersByTime(60_000);
    expect(consumeRateLimit('k', rule)).toBe(true);
    expect(consumeRateLimit('k', rule)).toBe(true);
    expect(consumeRateLimit('k', rule)).toBe(true);
    expect(consumeRateLimit('k', rule)).toBe(false);
  });

  it('counts each key separately', () => {
    for (let i = 0; i < 3; i++) consumeRateLimit('a', rule);
    expect(consumeRateLimit('a', rule)).toBe(false);
    expect(consumeRateLimit('b', rule)).toBe(true);
  });
});

describe('clientIp', () => {
  it('prefers the first x-forwarded-for hop', () => {
    const headers = new Headers({
      'x-forwarded-for': ' 203.0.113.7 , 10.0.0.1',
      'x-real-ip': '198.51.100.1',
    });
    expect(clientIp(headers)).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then to "unknown"', () => {
    expect(clientIp(new Headers({ 'x-real-ip': ' 198.51.100.1 ' }))).toBe('198.51.100.1');
    expect(clientIp(new Headers({ 'x-forwarded-for': '' }))).toBe('unknown');
    expect(clientIp(new Headers())).toBe('unknown');
  });
});
