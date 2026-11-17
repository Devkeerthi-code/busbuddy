import { answerFor, isStale } from '@/lib/answer';

const base = {
  status: 'active' as const,
  myTravelSeq: 2,
  doneSeq: 0,
  etas: [
    { seq: 1, stopId: 's1', seconds: 120 },
    { seq: 2, stopId: 's2', seconds: 600 },
  ],
  fixAt: 1_000_000,
  now: 1_000_000,
  firstStopTime: '07:05',
  departedMyStopAt: null,
  atMyStop: false,
};

describe('answerFor', () => {
  it('shows the departure time before the trip starts', () => {
    expect(answerFor({ ...base, status: 'scheduled' })).toEqual({ kind: 'not_started', departsAt: '07:05' });
  });

  it('counts the ETA down from the last fix while the signal is quiet', () => {
    expect(answerFor({ ...base, now: base.now + 60_000 })).toEqual({ kind: 'on_the_way', seconds: 540, arriving: false });
  });

  it('flags the arriving moment at five minutes', () => {
    expect(answerFor({ ...base, now: base.now + 300_000 })).toMatchObject({ seconds: 300, arriving: true });
  });

  it('never counts below zero', () => {
    expect(answerFor({ ...base, now: base.now + 3_600_000 })).toMatchObject({ seconds: 0 });
  });

  it('says the bus is at your stop, then that it left', () => {
    expect(answerFor({ ...base, atMyStop: true, doneSeq: 2 })).toEqual({ kind: 'at_stop' });
    expect(answerFor({ ...base, doneSeq: 3, departedMyStopAt: '07:21' })).toEqual({ kind: 'left', at: '07:21' });
  });

  it('distinguishes a finished trip that served your stop from one that did not', () => {
    expect(answerFor({ ...base, status: 'completed', doneSeq: 5 })).toEqual({ kind: 'left', at: null });
    expect(answerFor({ ...base, status: 'completed', doneSeq: 1 })).toEqual({ kind: 'completed' });
  });
});

describe('isStale', () => {
  it('turns stale after 30 s without a fix', () => {
    expect(isStale(0, 29_000)).toBe(false);
    expect(isStale(0, 31_000)).toBe(true);
    expect(isStale(null, 99_000)).toBe(false);
  });
});
