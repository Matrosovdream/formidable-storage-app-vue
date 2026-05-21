import { describe, it, expect } from 'vitest';
import { parseApiError } from '@/utils/errors';

describe('parseApiError', () => {
  it('extracts 422 field errors', () => {
    const err = { response: { data: { success: false, code: 422, message: 'invalid', errors: { email: ['bad email'] } } } };
    const parsed = parseApiError(err);
    expect(parsed.fields.email).toEqual(['bad email']);
    expect(parsed.message).toBe('invalid');
  });

  it('falls back to message-only when no errors map', () => {
    const err = { response: { data: { success: false, code: 401, message: 'Unauthenticated.' } } };
    const parsed = parseApiError(err);
    expect(parsed.fields).toEqual({});
    expect(parsed.message).toBe('Unauthenticated.');
  });

  it('uses err.message for network failures', () => {
    const err = { message: 'Network Error' };
    expect(parseApiError(err).message).toBe('Network Error');
  });

  it('returns generic message when nothing useful', () => {
    expect(parseApiError({}).message).toBe('Unexpected error.');
  });
});
