import { initialArrivalState, stepArrival, type ArrivalState, type StopRef } from '@core/arrival.ts';

const stops: StopRef[] = [
  { seq: 0, along: 0 },
  { seq: 1, along: 1000 },
  { seq: 2, along: 2000 },
];

/** Feed (distance-to-each-stop, progress) samples through the detector. */
function run(samples: { d: number[]; progress: number }[], start: ArrivalState = initialArrivalState()) {
  let state = start;
  const events: string[] = [];
  let completed = false;
  samples.forEach((s, i) => {
    const r = stepArrival(state, stops, s.d, s.progress, i * 5000);
    state = r.state;
    completed = r.completed;
    events.push(...r.events.map((e) => `${e.type}:${e.seq}`));
  });
  return { state, events, completed };
}

describe('stepArrival', () => {
  it('needs two consecutive fixes inside 40 m to arrive', () => {
    const one = run([{ d: [30, 970, 1970], progress: 0 }]);
    expect(one.events).toEqual([]);
    const two = run([
      { d: [30, 970, 1970], progress: 0 },
      { d: [20, 980, 1980], progress: 0 },
    ]);
    expect(two.events).toEqual(['arrive:0']);
    expect(two.state.atSeq).toBe(0);
  });

  it('does not flicker while the bus idles between 40 m and 80 m', () => {
    const r = run([
      { d: [10, 990, 1990], progress: 0 },
      { d: [10, 990, 1990], progress: 0 },
      { d: [60, 940, 1940], progress: 50 },
      { d: [35, 965, 1965], progress: 50 },
      { d: [70, 930, 1930], progress: 60 },
    ]);
    expect(r.events).toEqual(['arrive:0']);
    expect(r.state.atSeq).toBe(0);
  });

  it('departs once beyond 80 m', () => {
    const r = run([
      { d: [10, 990, 1990], progress: 0 },
      { d: [10, 990, 1990], progress: 0 },
      { d: [120, 880, 1880], progress: 120 },
    ]);
    expect(r.events).toEqual(['arrive:0', 'depart:0']);
    expect(r.state.atSeq).toBeNull();
  });

  it('marks a stop passed when the bus drives by without stopping', () => {
    const r = run(
      [
        { d: [400, 600, 1600], progress: 400 },
        { d: [1180, 180, 820], progress: 1180 },
      ],
      { atSeq: null, doneSeq: 0, candidateSeq: null, candidateCount: 0 },
    );
    expect(r.events).toEqual(['skip:1']);
    expect(r.state.doneSeq).toBe(1);
  });

  it('a single in-radius blip for a stop is not an arrival', () => {
    const r = run(
      [
        { d: [500, 35, 1500], progress: 990 },
        { d: [600, 90, 1400], progress: 1090 },
      ],
      { atSeq: null, doneSeq: 0, candidateSeq: null, candidateCount: 0 },
    );
    expect(r.events).toEqual([]);
  });

  it('completes the trip on arrival at the last stop', () => {
    const r = run(
      [
        { d: [2000, 1000, 20], progress: 1990 },
        { d: [2000, 1000, 10], progress: 1995 },
      ],
      { atSeq: null, doneSeq: 1, candidateSeq: null, candidateCount: 0 },
    );
    expect(r.events).toEqual(['arrive:2']);
    expect(r.completed).toBe(true);
  });

  it('does not re-arrive at a stop already done', () => {
    const r = run(
      [
        { d: [10, 990, 1990], progress: 0 },
        { d: [10, 990, 1990], progress: 0 },
      ],
      { atSeq: null, doneSeq: 0, candidateSeq: null, candidateCount: 0 },
    );
    expect(r.events).toEqual([]);
  });
});
