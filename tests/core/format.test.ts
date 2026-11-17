import { agoLabel, delayLabel, minutesFromSeconds, shortTime } from '@/lib/format';

describe('delayLabel', () => {
  it('calls 2+ minutes late "late"', () => {
    expect(delayLabel(150)).toEqual({ text: '3 min late', tone: 'late' });
  });
  it('treats small differences as on time', () => {
    expect(delayLabel(60)).toEqual({ text: 'On time', tone: 'ontime' });
    expect(delayLabel(-100)).toEqual({ text: 'On time', tone: 'ontime' });
  });
  it('shows early buses and missing schedules', () => {
    expect(delayLabel(-300)).toEqual({ text: '5 min early', tone: 'ontime' });
    expect(delayLabel(null).tone).toBe('neutral');
  });
});

describe('agoLabel', () => {
  it('reads like a person would say it', () => {
    expect(agoLabel(null, 0)).toBe('no signal yet');
    expect(agoLabel(0, 4000)).toBe('updated just now');
    expect(agoLabel(0, 40_000)).toBe('updated 40 s ago');
    expect(agoLabel(0, 5 * 60_000)).toBe('updated 5 min ago');
  });
});

describe('small formatters', () => {
  it('rounds minutes and trims Postgres times', () => {
    expect(minutesFromSeconds(89)).toBe(1);
    expect(minutesFromSeconds(-5)).toBe(0);
    expect(shortTime('07:05:00')).toBe('07:05');
    expect(shortTime(null)).toBe('–');
  });
});
