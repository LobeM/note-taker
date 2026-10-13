import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REDIRECT,
  parseMode,
  safeRedirectPath,
  signInSchema,
  signUpSchema,
} from '@/lib/auth-schemas';

describe('parseMode', () => {
  it('accepts signup and defaults everything else to signin', () => {
    expect(parseMode('signup')).toBe('signup');
    expect(parseMode('signin')).toBe('signin');
    expect(parseMode('admin')).toBe('signin');
    expect(parseMode(undefined)).toBe('signin');
    expect(parseMode(['signup'])).toBe('signin');
  });
});

describe('safeRedirectPath', () => {
  it('keeps same-origin paths with their query and hash', () => {
    expect(safeRedirectPath('/notes/abc')).toBe('/notes/abc');
    expect(safeRedirectPath('/notes/abc/edit?x=1#top')).toBe('/notes/abc/edit?x=1#top');
  });

  it.each([
    ['protocol-relative', '//evil.com'],
    ['tab-smuggled', '/\t/evil.com'],
    ['newline-smuggled', '/\n/evil.com'],
    ['backslash', '/\\evil.com'],
    ['absolute URL', 'https://evil.com/notes'],
    ['javascript: URL', 'javascript:alert(1)'],
    ['relative path', 'notes/abc'],
    ['empty string', ''],
  ])('rejects a %s target', (_label, value) => {
    expect(safeRedirectPath(value)).toBe(DEFAULT_REDIRECT);
  });

  it('rejects non-strings, e.g. a missing form field', () => {
    expect(safeRedirectPath(null)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeRedirectPath(42)).toBe(DEFAULT_REDIRECT);
  });

  it('normalizes the path so control characters never reach a Location header', () => {
    expect(safeRedirectPath('/notes/a\tb')).toBe('/notes/ab');
    expect(safeRedirectPath('/a/../dashboard')).toBe('/dashboard');
  });
});

describe('signInSchema', () => {
  it('requires a valid email and a non-empty password', () => {
    expect(signInSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
    expect(signInSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
    expect(signInSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const valid = { name: 'Ada', email: 'ada@example.com', password: 'longenough' };

  it('accepts valid input and trims the name', () => {
    expect(signUpSchema.parse({ ...valid, name: '  Ada  ' }).name).toBe('Ada');
  });

  it('rejects a blank name, short password, and over-long fields', () => {
    expect(signUpSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: 'x'.repeat(129) }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, name: 'x'.repeat(81) }).success).toBe(false);
  });
});
