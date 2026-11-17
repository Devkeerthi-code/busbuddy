import { inTravelOrder, shapeInTravelOrder } from '@core/direction.ts';
import { at } from './helpers';

const stops = [
  { seq: 0, along: 0, name: 'Depot' },
  { seq: 1, along: 1200, name: 'Middle' },
  { seq: 2, along: 3000, name: 'Campus' },
];

describe('inTravelOrder', () => {
  it('keeps the morning order', () => {
    expect(inTravelOrder(stops, 3000, 'morning').map((s) => [s.name, s.travelSeq, s.travelAlong])).toEqual([
      ['Depot', 0, 0],
      ['Middle', 1, 1200],
      ['Campus', 2, 3000],
    ]);
  });

  it('reverses evening trips and measures from the campus end', () => {
    expect(inTravelOrder(stops, 3000, 'evening').map((s) => [s.name, s.travelSeq, s.travelAlong])).toEqual([
      ['Campus', 0, 0],
      ['Middle', 1, 1800],
      ['Depot', 2, 3000],
    ]);
  });

  it('reverses the shape for evening only', () => {
    const shape = [at(0, 0), at(100, 0)];
    expect(shapeInTravelOrder(shape, 'morning')).toBe(shape);
    expect(shapeInTravelOrder(shape, 'evening')[0]).toEqual(shape[1]);
  });
});
