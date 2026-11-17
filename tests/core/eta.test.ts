import { delaySeconds, ETA_DEFAULTS, estimateStopEtas, historyWeight, updateSpeed } from '@core/eta.ts';
import { buildRoute } from '@core/route.ts';
import { initialTrackerState, processFix, type TrackerContext } from '@core/tracker.ts';
import { at } from './helpers';

describe('updateSpeed', () => {
  it('starts from the first observed speed and smooths after', () => {
    const first = updateSpeed(null, 50, 5);
    expect(first).toBe(10);
    expect(updateSpeed(first, 0, 5)).toBeCloseTo(7, 5);
  });

  it('ignores backwards progress', () => {
    expect(updateSpeed(null, -30, 5)).toBe(0);
  });
});

describe('estimateStopEtas', () => {
  const upcoming = [
    { seq: 1, along: 1000 },
    { seq: 2, along: 2000 },
  ];

  it('divides remaining distance by smoothed speed and adds dwell for stops in between', () => {
    const etas = estimateStopEtas({ progress: 0, speedEwma: 10, upcoming, doneSeq: 0, doneAlong: 0 });
    expect(etas).toEqual([
      { seq: 1, seconds: 100 },
      { seq: 2, seconds: 100 + ETA_DEFAULTS.dwellSeconds + 100 },
    ]);
  });

  it('clamps a stationary bus to a minimum speed instead of infinity', () => {
    const [first] = estimateStopEtas({ progress: 0, speedEwma: 0, upcoming, doneSeq: 0, doneAlong: 0 });
    expect(first.seconds).toBe(1000 / ETA_DEFAULTS.minSpeedMps);
  });

  it('uses a fallback speed before any movement is known', () => {
    const [first] = estimateStopEtas({ progress: 0, speedEwma: null, upcoming, doneSeq: 0, doneAlong: 0 });
    expect(first.seconds).toBe(Math.round(1000 / ETA_DEFAULTS.fallbackSpeedMps));
  });

  it('blends towards history once enough trips exist', () => {
    const history = new Map([[0, { seconds: 300, trips: 10 }]]);
    const far = [{ seq: 1, along: 5000 }];
    const live = estimateStopEtas({ progress: 0, speedEwma: 20, upcoming: far, doneSeq: 0, doneAlong: 0 });
    const blended = estimateStopEtas({ progress: 0, speedEwma: 20, upcoming: far, doneSeq: 0, doneAlong: 0, history });
    expect(live[0].seconds).toBe(250);
    expect(blended[0].seconds).toBeGreaterThan(250);
    expect(blended[0].seconds).toBeLessThan(300);
  });

  it('ignores history with too few trips', () => {
    expect(historyWeight(2, 5000)).toBe(0);
    expect(historyWeight(10, 5000)).toBeCloseTo(0.7);
  });

  it('lets live data win close to the stop', () => {
    expect(historyWeight(10, 300)).toBe(0);
  });
});

describe('delaySeconds', () => {
  it('is positive when the bus will be late', () => {
    expect(delaySeconds(0, 600, 300_000)).toBe(300);
    expect(delaySeconds(0, 600, null)).toBeNull();
  });
});

describe('processFix end to end with jitter and stops', () => {
  // 3 km straight road, stops every 1.5 km.
  const route = buildRoute([at(0, 0), at(3000, 0)]);
  const ctx: TrackerContext = {
    route,
    stops: [
      { ...at(0, 0), seq: 0, along: 0, scheduledAt: 0 },
      { ...at(1500, 0), seq: 1, along: 1500, scheduledAt: 300_000 },
      { ...at(3000, 0), seq: 2, along: 3000, scheduledAt: 600_000 },
    ],
  };

  it('keeps ETA steady and monotonic despite sideways noise and a bad fix', () => {
    let state = initialTrackerState();
    const etasToStop2: number[] = [];
    let rejected = 0;
    // 10 m/s, a fix every 5 s; deterministic sideways wobble of +/- 15 m.
    for (let i = 0; i <= 60; i++) {
      const t = i * 5000;
      const wobble = (i % 2 === 0 ? 1 : -1) * 15;
      const accuracy = i === 20 ? 200 : 10;
      const r = processFix(state, { ...at(i * 50, wobble), t, accuracy }, ctx);
      if (!r.accepted) {
        rejected++;
        continue;
      }
      state = r.state;
      const eta2 = r.etas.find((e) => e.seq === 2);
      if (eta2 && i > 5 && i < 25) etasToStop2.push(eta2.seconds);
    }
    expect(rejected).toBe(1);
    for (let k = 1; k < etasToStop2.length; k++) {
      expect(etasToStop2[k]).toBeLessThanOrEqual(etasToStop2[k - 1] + 1);
    }
    expect(state.speedEwma).toBeGreaterThan(9);
    expect(state.speedEwma).toBeLessThan(11);
  });

  it('records arrivals, finishes at the last stop and reports delay', () => {
    let state = initialTrackerState();
    const events: string[] = [];
    let completed = false;
    let lastDelay: number | null = null;
    // Waits at the depot for two fixes, drives through stop 1 without stopping, parks at stop 2.
    for (let i = 0; i <= 70 && !completed; i++) {
      const east = Math.min(Math.max((i - 2) * 50, 0), 3000);
      const r = processFix(state, { ...at(east, 0), t: i * 5000, accuracy: 5 }, ctx);
      if (!r.accepted) continue;
      state = r.state;
      events.push(...r.events.map((e) => `${e.type}:${e.seq}`));
      completed = r.completed;
      if (r.delaySec !== null) lastDelay = r.delaySec;
    }
    expect(events).toEqual(['arrive:0', 'depart:0', 'skip:1', 'arrive:2']);
    expect(completed).toBe(true);
    expect(lastDelay).not.toBeNull();
  });

  it('does not let waiting at a stop inflate the ETA', () => {
    let state = initialTrackerState();
    const etaToLast: number[] = [];
    // Drives 10 m/s to stop 1 (1500 m), waits there 2 minutes, then continues.
    const positions = [
      ...Array.from({ length: 31 }, (_, i) => i * 50),
      ...Array.from({ length: 24 }, () => 1500),
      ...Array.from({ length: 4 }, (_, i) => 1550 + i * 50),
    ];
    positions.forEach((east, i) => {
      const r = processFix(state, { ...at(east, 0), t: i * 5000, accuracy: 5 }, ctx);
      if (!r.accepted) return;
      state = r.state;
      const eta = r.etas.find((e) => e.seq === 2);
      if (eta) etaToLast.push(eta.seconds);
    });
    // 1.5 km left at ~10 m/s is ~150 s; with the old behaviour this was 750 s (2 m/s floor).
    expect(etaToLast[etaToLast.length - 1]).toBeLessThan(200);
    expect(state.speedEwma).toBeGreaterThan(8);
  });

  it('marks breadcrumbs every 30 s only', () => {
    let state = initialTrackerState();
    let stored = 0;
    for (let i = 0; i < 13; i++) {
      const r = processFix(state, { ...at(i * 50, 0), t: i * 5000, accuracy: 5 }, ctx);
      if (r.accepted) {
        state = r.state;
        if (r.storeBreadcrumb) stored++;
      }
    }
    expect(stored).toBe(3);
  });
});

describe('processFix on a road that doubles back', () => {
  // 1 km east, U-turn at a median gap, 1 km back west on the other carriageway 15 m away.
  const route = buildRoute([at(0, 0), at(1000, 0), at(1000, 15), at(0, 15)]);
  const ctx: TrackerContext = {
    route,
    stops: [
      { ...at(0, 0), seq: 0, along: 0, scheduledAt: null },
      { ...at(0, 15), seq: 1, along: route.length, scheduledAt: null },
    ],
  };

  it('stays on the outbound leg even when a fix is closer to the return leg', () => {
    let state = initialTrackerState();
    for (let i = 0; i <= 6; i++) {
      const wobble = i === 6 ? 12 : 0; // last fix drifts towards the other carriageway
      const r = processFix(state, { ...at(i * 50, wobble), t: i * 5000, accuracy: 8 }, ctx);
      if (r.accepted) state = r.state;
    }
    expect(state.progress).toBeGreaterThan(250);
    expect(state.progress).toBeLessThan(400);
  });

  it('follows the return leg once the bus has actually driven round the U-turn', () => {
    let state = initialTrackerState();
    const path = [...Array.from({ length: 21 }, (_, i) => at(i * 50, 0)), at(1000, 15),
      ...Array.from({ length: 10 }, (_, i) => at(950 - i * 50, 15))];
    path.forEach((p, i) => {
      const r = processFix(state, { ...p, t: i * 5000, accuracy: 8 }, ctx);
      if (r.accepted) state = r.state;
    });
    expect(state.progress).toBeGreaterThan(1400);
  });
});
