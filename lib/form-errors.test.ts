import { expect, it } from 'vitest';
import { z } from 'zod';
import { toFieldErrors } from '@/lib/form-errors';

it('keeps the first message per top-level field', () => {
  const schema = z.object({
    email: z.string().min(5, 'too short').includes('@', { message: 'needs @' }),
    name: z.string().min(1, 'required'),
  });
  const result = schema.safeParse({ email: 'ab', name: '' });

  expect(toFieldErrors(result.error!)).toEqual({ email: 'too short', name: 'required' });
});

it('ignores issues without a named field', () => {
  const result = z.string().safeParse(1);
  expect(toFieldErrors(result.error!)).toEqual({});
});
