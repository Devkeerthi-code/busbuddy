import { answerFor, ARRIVING_SECONDS, isStale, STALE_AFTER_MS } from '@/lib/answer';

const base = {
  status: 'active' as const,
  myTravelSeq: 2,
  doneSeq: 0,
  etas: [{ seq: 2, stopId: 's2', seconds: 600 }],
  fixAt: 1_000_000,
  now: 1_000_000,
  firstStopTime: '07:05:00',
  departedMyStopAt: null,
  atMyStop: false,
};

describe('answerFor', () => {
  it('says when a scheduled trip departs', () => {
    expect(answerFor({ ...base, status: 'scheduled' })).toEqual({ kind: 'not_started', departsAt: '07:05:00' });
  });

  it('reports cancelled trips before anything else', () => {
    expect(answerFor({ ...base, status: 'cancelled', atMyStop: true })).toEqual({ kind: 'cancelled' });
  });

  it('counts the ETA down from the time of the last fix', () => {
    const a = answerFor({ ...base, now: base.fixAt + 120_000 });
    expect(a).toEqual({ kind: 'on_the_way', seconds: 480, arriving: false });
  });

  it('flags the bus as arriving inside five minutes', () => {
    const a = answerFor({ ...base, etas: [{ seq: 2, stopId: 's2', seconds: ARRIVING_SECONDS }] });
    expect(a).toMatchObject({ kind: 'on_the_way', arriving: true });
  });

  it('never counts below zero', () => {
    expect(answerFor({ ...base, now: base.fixAt + 3_600_000 })).toMatchObject({ seconds: 0 });
  });

  it('says the bus left once my stop is done', () => {
    expect(answerFor({ ...base, doneSeq: 2, departedMyStopAt: '07:31:00' })).toEqual({ kind: 'left', at: '07:31:00' });
  });

  it('shows the bus at my stop while it waits there', () => {
    expect(answerFor({ ...base, atMyStop: true })).toEqual({ kind: 'at_stop' });
  });
});

describe('isStale', () => {
  it('is stale only after the limit and never without a fix', () => {
    expect(isStale(0, STALE_AFTER_MS)).toBe(false);
    expect(isStale(0, STALE_AFTER_MS + 1)).toBe(true);
    expect(isStale(null, 10 * STALE_AFTER_MS)).toBe(false);
  });
});
