/**
 * No 0/O or 1/I/L: codes are read aloud in class and typed on cheap keyboards.
 * Must match public.generate_invite_code() in the database.
 */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const INVITE_LENGTH = 6;

const INVITE_PATTERN = new RegExp(`^[${INVITE_ALPHABET}]{${INVITE_LENGTH}}$`);

/** Uppercase and drop the spaces/dashes people add when copying a code from a chat. */
export function normalizeInviteCode(raw: string): string {
  return raw.toUpperCase().replace(/[\s-]/g, '');
}

export function isValidInviteCode(code: string): boolean {
  return INVITE_PATTERN.test(code);
}
