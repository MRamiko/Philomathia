import { describe, expect, it } from 'vitest';
import { cleanDisplayName, validDisplayName, displayName, avatarInitial } from './display-name';
describe('Display names', () => {
  it('accepts 1 to 40 Unicode characters, not bytes', () => { expect(validDisplayName('ა')).toBe(true); expect(validDisplayName('ა'.repeat(40))).toBe(true); expect(validDisplayName('ა'.repeat(41))).toBe(false); });
  it('rejects empty and whitespace-only names', () => { expect(validDisplayName('')).toBe(false); expect(validDisplayName('   ')).toBe(false); });
  it('trims spaces and removes controls', () => { expect(cleanDisplayName('  ამ\u0000იკო\u200b  ')).toBe('ამიკო'); });
  it('allows letters, digits and basic punctuation', () => { expect(validDisplayName('ამიკო Reader-2.')).toBe(true); expect(validDisplayName('😀')).toBe(false); });
  it('uses the Georgian initial and only the email prefix as fallback', () => { expect(avatarInitial('ამიკო')).toBe('ა'); expect(displayName('', 'reader@example.com')).toBe('reader'); });
});