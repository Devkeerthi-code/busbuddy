import { ALERT_THRESHOLD_SECONDS, alertMessage, stopsDueForAlert } from '@core/alerts.ts';

describe('stopsDueForAlert', () => {
  it('includes a stop exactly at five minutes and excludes one a second later', () => {
    const etas = [
      { seq: 1, seconds: ALERT_THRESHOLD_SECONDS },
      { seq: 2, seconds: ALERT_THRESHOLD_SECONDS + 1 },
    ];
    expect(stopsDueForAlert(etas)).toEqual([1]);
  });

  it('returns nothing when no ETAs are known', () => {
    expect(stopsDueForAlert([])).toEqual([]);
  });

  it('accepts a custom threshold', () => {
    expect(stopsDueForAlert([{ seq: 4, seconds: 500 }], 600)).toEqual([4]);
  });
});

describe('alertMessage', () => {
  it('rounds to whole minutes and never says 0 minutes', () => {
    expect(alertMessage('12', 'Old Toll Gate', 290).title).toBe('Bus 12 is about 5 min away');
    expect(alertMessage('12', 'Old Toll Gate', 10).title).toBe('Bus 12 is about 1 min away');
  });

  it('tells the student where to go', () => {
    expect(alertMessage('7', 'Library', 200).body).toBe('Head to Library now.');
  });
});
