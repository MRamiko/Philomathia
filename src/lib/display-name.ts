export function cleanDisplayName(value: string) { return value.replace(/[\p{Cc}\p{Cf}]/gu, '').trim(); }
export function validDisplayName(value: string) {
  const name = cleanDisplayName(value);
  return Array.from(name).length >= 1 && Array.from(name).length <= 40 && /^[\p{L}\p{N} \p{P}]+$/u.test(name);
}
export function displayName(name: string | null | undefined, email: string) { return cleanDisplayName(name ?? '') || email.split('@')[0] || 'Φ'; }
export function avatarInitial(name: string) { return Array.from(name)[0] ?? 'Φ'; }