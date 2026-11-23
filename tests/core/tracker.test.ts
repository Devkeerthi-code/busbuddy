import { buildRoute } from '@core/route.ts';
import { initialTrackerState, processFix, TRACKER_DEFAULTS, type TrackerContext } from '@core/tracker.ts';
import { at } from './helpers';

const ctx: TrackerContext = {
  route: buildRoute([at(0, 0), at(3000, 0)]),
  stops: [
    { ...at(0, 0), seq: 0, along: 0, scheduledAt: 0 },
    { ...at(1500, 0), seq: 1, along: 1500, scheduledAt: 300_000 },
    { ...at(3000, 0), seq: 2, along: 3000, scheduledAt: 1_000_000 },
  ],
};

describe('processFix', () => {
  it('returns the old state unchanged when a fix is rejected', () => {
    const state = initialTrackerState();
    const r = processFix(state, { ...at(0, 0), t: 0, accuracy: 500 }, ctx);
    expect(r).toEqual({ accepted: false, reason: 'low_accuracy', state });
  });

  it('never moves progress backwards on a small reverse wobble', () => {
    let s = processFix(initialTrackerState(), { ...at(600, 0), t: 0, accuracy: 5 }, ctx).state;
    const r = processFix(s, { ...at(580, 0), t: 5000, accuracy: 5 }, ctx);
    s = r.state;
    expect(s.progress).toBeCloseTo(600, 0);
  });

  it('flags fixes far from the road as off route', () => {
    const r = processFix(initialTrackerState(), { ...at(600, TRACKER_DEFAULTS.offRouteM + 50), t: 0, accuracy: 5 }, ctx);
    expect(r.accepted && r.offRoute).toBe(true);
  });

  it('measures delay against the stop the first ETA is for', () => {
    // Picked up 100 m past stop 1, before it counts as passed: the delay must use stop 2's timetable.
    const r = processFix(initialTrackerState(), { ...at(1600, 0), t: 900_000, accuracy: 5 }, ctx);
    if (!r.accepted) throw new Error('fix rejected');
    expect(r.etas[0].seq).toBe(2);
    const expected = Math.round((900_000 + r.etas[0].seconds * 1000 - 1_000_000) / 1000);
    expect(r.delaySec).toBe(expected);
  });
});
