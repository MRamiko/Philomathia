import { describe, expect, it } from 'vitest';
import { endpointName, MAX_READ_RETRIES, REQUEST_TIMEOUT_MS, scrub, shouldRetry } from './startup-diagnostics';
describe('Startup request safety', () => {
  it('ends a request after eight seconds', () => expect(REQUEST_TIMEOUT_MS).toBe(8000));
  it('allows at most two read retries', () => expect(MAX_READ_RETRIES).toBe(2));
  it('never retries writes', () => expect(shouldRetry('POST', 503)).toBe(false));
  it('never retries access denied', () => expect(shouldRetry('GET', 403)).toBe(false));
  it('retries server failures for reads', () => expect(shouldRetry('GET', 503)).toBe(true));
  it('records endpoints without values', () => expect(endpointName('https://example.test/rest/v1/profiles?id=eq.private')).toBe('profiles'));
  it('scrubs email, user IDs and tokens from reports', () => expect(scrub('a@b.com 12345678-1234-1234-1234-123456789abc token=abc sb_secret_abc')).toBe('[email] [id] [credential] [secret]'));
});