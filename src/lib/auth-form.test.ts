import { describe, it, expect } from 'vitest';
import { signupValidity } from './auth-form';
describe('Sign-up rules', () => {
  it('requires at least eight password characters', () => {
    expect(signupValidity('Name', 'reader@example.com', '1234567', '1234567').password).toBe(false);
    expect(signupValidity('Name', 'reader@example.com', '12345678', '12345678').password).toBe(true);
  });
  it('requires matching passwords', () => {
    expect(signupValidity('Name', 'reader@example.com', '12345678', '12345679').confirmation).toBe(false);
    expect(signupValidity('Name', 'reader@example.com', '12345678', '12345678').confirmation).toBe(true);
  });
});