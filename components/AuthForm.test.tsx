import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { authenticate } from '@/app/auth/actions';
import { AuthForm } from '@/components/AuthForm';

vi.mock('@/app/auth/actions', () => ({ authenticate: vi.fn(async () => ({})) }));

describe('AuthForm', () => {
  it('shows email and password for sign in', () => {
    render(<AuthForm mode='signin' next='/dashboard' />);

    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.getByLabelText('Email')).toHaveProperty('autocomplete', 'email');
    expect(screen.getByLabelText('Password')).toHaveProperty('autocomplete', 'current-password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
  });

  it('adds a name field and password hint for sign up', () => {
    render(<AuthForm mode='signup' next='/dashboard' />);

    expect(screen.getByLabelText('Name')).toBeTruthy();
    const password = screen.getByLabelText('Password');
    expect(password.getAttribute('minlength')).toBe('8');
    expect(password.getAttribute('aria-describedby')).toBe('password-hint');
    expect(screen.getByText('At least 8 characters.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
  });

  it('submits the mode and next, then shows the errors that come back', async () => {
    vi.mocked(authenticate).mockResolvedValueOnce({
      formError: 'Invalid email or password',
      fieldErrors: { password: 'Password is required' },
      values: { email: 'ada@example.com' },
    });
    const user = userEvent.setup();
    render(<AuthForm mode='signin' next='/notes/abc' />);

    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'pw');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect((await screen.findByRole('alert')).textContent).toBe('Invalid email or password');
    const [mode, , formData] = vi.mocked(authenticate).mock.calls[0]!;
    expect(mode).toBe('signin');
    expect(Object.fromEntries(formData)).toEqual({
      next: '/notes/abc',
      email: 'ada@example.com',
      password: 'pw',
    });

    const password = screen.getByLabelText('Password');
    expect(password.getAttribute('aria-invalid')).toBe('true');
    expect(password.getAttribute('aria-describedby')).toBe('password-error');
    expect(screen.getByText('Password is required').id).toBe('password-error');
    expect(screen.getByLabelText('Email')).toHaveProperty('value', 'ada@example.com');
  });
});
