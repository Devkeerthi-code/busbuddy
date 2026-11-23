import { initialArrivalState, stepArrival } from '@core/arrival.ts';

const stops = [
  { seq: 0, along: 0 },
  { seq: 1, along: 1000 },
  { seq: 2, along: 2000 },
];

describe('stepArrival options and resets', () => {
  it('arrives on the first fix when confirmFixes is 1', () => {
    const r = stepArrival(initialArrivalState(), stops, [10, 1000, 2000], 0, 1, { confirmFixes: 1 });
    expect(r.events).toEqual([{ type: 'arrive', seq: 0, t: 1 }]);
    expect(r.state.atSeq).toBe(0);
  });

  it('resets the candidate when the bus leaves the radius before confirming', () => {
    let s = stepArrival(initialArrivalState(), stops, [900, 20, 1000], 980, 1).state;
    expect(s.candidateSeq).toBe(1);
    s = stepArrival(s, stops, [900, 60, 1000], 1040, 2).state;
    expect(s.candidateSeq).toBeNull();
    expect(s.candidateCount).toBe(0);
  });

  it('skips earlier stops when arriving further down the route', () => {
    let s = initialArrivalState();
    const events: string[] = [];
    for (const t of [1, 2]) {
      const r = stepArrival(s, stops, [2000, 1000, 15], 1990, t);
      s = r.state;
      events.push(...r.events.map((e) => `${e.type}:${e.seq}`));
    }
    expect(events).toEqual(['skip:0', 'skip:1', 'arrive:2']);
  });

  it('reports no completion for a route without stops', () => {
    expect(stepArrival(initialArrivalState(), [], [], 0, 1).completed).toBe(false);
  });
});
