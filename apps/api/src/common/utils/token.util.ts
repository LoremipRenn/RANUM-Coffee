import { randomBytes } from 'node:crypto';

export function generateSecureToken(byteLength = 24): string {
  return randomBytes(byteLength).toString('base64url');
}

export function generateOrderNumber(sequenceHint?: number): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const suffix =
    sequenceHint !== undefined
      ? String(sequenceHint).padStart(4, '0')
      : randomBytes(2).toString('hex').toUpperCase();
  return `RNM-${y}${m}${d}-${suffix}`;
}
