import { alertMessage, newAlerts, stopsDueForAlert } from '@core/alerts.ts';
import { isValidInviteCode, normalizeInviteCode } from '@core/invite.ts';

describe('alerts', () => {
  it('picks stops within five minutes', () => {
    expect(stopsDueForAlert([{ seq: 1, seconds: 120 }, { seq: 2, seconds: 300 }, { seq: 3, seconds: 301 }])).toEqual([1, 2]);
  });

  it('never returns an alert that was already sent, or the same one twice in a batch', () => {
    const sent = [{ tripId: 't1', userId: 'u1', kind: 'eta5' }];
    const fresh = newAlerts(sent, [
      { tripId: 't1', userId: 'u1', kind: 'eta5' },
      { tripId: 't1', userId: 'u2', kind: 'eta5' },
      { tripId: 't1', userId: 'u2', kind: 'eta5' },
      { tripId: 't2', userId: 'u1', kind: 'eta5' },
    ]);
    expect(fresh).toEqual([
      { tripId: 't1', userId: 'u2', kind: 'eta5' },
      { tripId: 't2', userId: 'u1', kind: 'eta5' },
    ]);
  });

  it('writes a short, specific message', () => {
    expect(alertMessage('12', 'Banyan Gate', 290)).toEqual({
      title: 'Bus 12 is about 5 min away',
      body: 'Head to Banyan Gate now.',
    });
  });
});

describe('invite codes', () => {
  it('normalises what people paste', () => {
    expect(normalizeInviteCode(' abc-d23 ')).toBe('ABCD23');
  });

  it('accepts only 6 characters from the unambiguous alphabet', () => {
    expect(isValidInviteCode('ABCD23')).toBe(true);
    expect(isValidInviteCode('ABCD2')).toBe(false);
    expect(isValidInviteCode('ABCD0O')).toBe(false);
    expect(isValidInviteCode('ABCDE1')).toBe(false);
  });
});
