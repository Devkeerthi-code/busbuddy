import { agoLabel, clockTime, minutesFromSeconds, shortTime } from '@/lib/format';

describe('time labels', () => {
  it('shows the college local clock time', () => {
    expect(clockTime(new Date('2026-01-01T02:30:00Z'), 'Asia/Kolkata')).toBe('08:00');
  });

  it('shows a dash when there is no time', () => {
    expect(shortTime(null)).toBe('–');
    expect(shortTime(undefined)).toBe('–');
  });

  it('never shows negative minutes', () => {
    expect(minutesFromSeconds(-30)).toBe(0);
  });

  it('handles phone clocks slightly ahead of the server', () => {
    expect(agoLabel(10_000, 5_000)).toBe('updated just now');
  });

  it('gives up counting after an hour', () => {
    expect(agoLabel(0, 2 * 3_600_000)).toBe('updated over an hour ago');
  });
});
