import { inTravelOrder, shapeInTravelOrder } from '@core/direction.ts';

const stops = [
  { seq: 0, along: 0, name: 'Depot' },
  { seq: 1, along: 400, name: 'Market' },
  { seq: 2, along: 1000, name: 'Campus' },
];

describe('inTravelOrder', () => {
  it('keeps the morning order and distances', () => {
    expect(inTravelOrder(stops, 1000, 'morning').map((s) => [s.name, s.travelSeq, s.travelAlong])).toEqual([
      ['Depot', 0, 0],
      ['Market', 1, 400],
      ['Campus', 2, 1000],
    ]);
  });

  it('reverses evening trips and measures from the campus end', () => {
    expect(inTravelOrder(stops, 1000, 'evening').map((s) => [s.name, s.travelSeq, s.travelAlong])).toEqual([
      ['Campus', 0, 0],
      ['Market', 1, 600],
      ['Depot', 2, 1000],
    ]);
  });

  it('does not reorder the input array', () => {
    const copy = [...stops];
    inTravelOrder(stops, 1000, 'evening');
    expect(stops).toEqual(copy);
  });

  it('never returns a negative distance for a stop snapped past the end', () => {
    const [first] = inTravelOrder([{ seq: 0, along: 1005 }], 1000, 'evening');
    expect(first.travelAlong).toBe(0);
  });
});

describe('shapeInTravelOrder', () => {
  const shape = [
    { lng: 80, lat: 12 },
    { lng: 80.1, lat: 12.1 },
  ];

  it('reverses the line for evening trips without touching the input', () => {
    expect(shapeInTravelOrder(shape, 'evening')).toEqual([shape[1], shape[0]]);
    expect(shape[0]).toEqual({ lng: 80, lat: 12 });
  });

  it('returns the line unchanged in the morning', () => {
    expect(shapeInTravelOrder(shape, 'morning')).toBe(shape);
  });
});
