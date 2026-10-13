import { expect, it } from 'vitest';
import { formatDate, parseSqliteDate } from '@/lib/dates';

it('reads SQLite datetime() values as UTC', () => {
  expect(parseSqliteDate('2026-03-04 05:06:07').toISOString()).toBe('2026-03-04T05:06:07.000Z');
});

it('formats a date with a medium date and short time', () => {
  const formatted = formatDate(new Date(2026, 2, 4, 15, 30));
  expect(formatted).toMatch(/Mar 4, 2026/);
  expect(formatted).toMatch(/3:30/);
});
