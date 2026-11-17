import { suggestTimes, TIME_PATTERN } from '@/lib/admin-data';

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

describe('suggestTimes', () => {
  const stops = [
    { id: 'a', name: 'Depot', along: 0 },
    { id: 'b', name: 'Market', along: 3667 },
    { id: 'c', name: 'Campus', along: 11000 },
  ];

  it('spaces stops by distance at 22 km/h plus half a minute per stop', () => {
    expect(suggestTimes('07:00', stops).map((s) => s.time)).toEqual(['07:00', '07:11', '07:31']);
  });

  it('works for evening runs measured from the other end, and wraps past midnight', () => {
    const evening = [...stops].reverse();
    expect(suggestTimes('23:50', evening).map((s) => s.time)).toEqual(['23:50', '00:10', '00:21']);
  });
});

describe('TIME_PATTERN', () => {
  it('accepts 24-hour HH:MM only', () => {
    expect(TIME_PATTERN.test('07:05')).toBe(true);
    expect(TIME_PATTERN.test('7:05')).toBe(false);
    expect(TIME_PATTERN.test('24:00')).toBe(false);
  });
});
