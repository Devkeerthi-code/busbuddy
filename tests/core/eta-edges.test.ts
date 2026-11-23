import { delaySeconds, ETA_DEFAULTS, estimateStopEtas, historyWeight, updateSpeed } from '@core/eta.ts';

describe('ETA edge cases', () => {
  it('keeps the previous speed when no time has passed', () => {
    expect(updateSpeed(8, 40, 0)).toBe(8);
  });

  it('returns no ETAs when there are no stops left', () => {
    expect(estimateStopEtas({ progress: 500, speedEwma: 10, upcoming: [], doneSeq: 3, doneAlong: 500 })).toEqual([]);
  });

  it('caps an unrealistic smoothed speed', () => {
    const [eta] = estimateStopEtas({ progress: 0, speedEwma: 60, upcoming: [{ seq: 1, along: 1000 }], doneSeq: 0, doneAlong: 0 });
    expect(eta.seconds).toBe(1000 / ETA_DEFAULTS.maxSpeedMps);
  });

  it('weights history by both trip count and distance left', () => {
    expect(historyWeight(10, 1500)).toBeCloseTo(0.35);
    expect(historyWeight(30, 5000)).toBeCloseTo(ETA_DEFAULTS.maxHistoryWeight);
  });

  it('reports early buses as a negative delay', () => {
    expect(delaySeconds(0, 60, 300_000)).toBe(-240);
  });
});
