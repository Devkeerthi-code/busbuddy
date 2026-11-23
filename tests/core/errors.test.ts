import { friendlyError } from '@/lib/errors';

describe('friendlyError', () => {
  it('maps database error codes to plain sentences', () => {
    expect(friendlyError({ message: 'invalid_code' })).toMatch(/match any college/);
    expect(friendlyError(new Error('too_many_attempts'))).toMatch(/Wait 10 minutes/);
  });

  it('maps auth messages', () => {
    expect(friendlyError(new Error('Invalid login credentials'))).toBe('Email or password is wrong.');
    expect(friendlyError(new Error('Email not confirmed'))).toMatch(/Confirm your email/);
  });

  it('explains network failures on web and native', () => {
    expect(friendlyError(new TypeError('Failed to fetch'))).toMatch(/internet connection/);
    expect(friendlyError(new TypeError('Network request failed'))).toMatch(/internet connection/);
  });

  it('handles duplicates and rate limits', () => {
    expect(friendlyError(new Error('duplicate key value violates unique constraint'))).toMatch(/already exists/);
    expect(friendlyError(new Error('email rate limit exceeded'))).toMatch(/Too many requests/);
  });

  it('falls back to a generic message for anything else, including strings', () => {
    expect(friendlyError('boom')).toBe('Something went wrong. Try again in a moment.');
    expect(friendlyError(undefined)).toBe('Something went wrong. Try again in a moment.');
  });
});
