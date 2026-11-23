import { INVITE_ALPHABET, INVITE_LENGTH, isValidInviteCode, normalizeInviteCode } from '@core/invite.ts';

describe('invite alphabet', () => {
  it('leaves out characters that are easy to confuse', () => {
    for (const ch of ['0', 'O', '1', 'I', 'L']) expect(INVITE_ALPHABET).not.toContain(ch);
  });

  it('has 31 symbols and six-character codes', () => {
    expect(INVITE_ALPHABET).toHaveLength(31);
    expect(INVITE_LENGTH).toBe(6);
  });
});

describe('normalizeInviteCode', () => {
  it('uppercases and strips spaces and dashes', () => {
    expect(normalizeInviteCode(' ab c-23 4\n')).toBe('ABC234');
  });
});

describe('isValidInviteCode', () => {
  it('accepts a well-formed code', () => {
    expect(isValidInviteCode('ABC234')).toBe(true);
  });

  it('rejects wrong length, lowercase and confusable characters', () => {
    expect(isValidInviteCode('ABC23')).toBe(false);
    expect(isValidInviteCode('ABC2345')).toBe(false);
    expect(isValidInviteCode('abc234')).toBe(false);
    expect(isValidInviteCode('ABC20O')).toBe(false);
  });
});
