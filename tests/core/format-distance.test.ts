import { distanceLabel } from '@/lib/format';

describe('distanceLabel', () => {
  it('rounds short distances to 10 m', () => {
    expect(distanceLabel(344)).toBe('340 m');
    expect(distanceLabel(4)).toBe('0 m');
  });

  it('switches to kilometres with one decimal', () => {
    expect(distanceLabel(1530)).toBe('1.5 km');
  });

  it('reads 1.0 km, not 1000 m, just under a kilometre', () => {
    expect(distanceLabel(996)).toBe('1.0 km');
    expect(distanceLabel(994)).toBe('990 m');
  });
});
