// __tests__/computeStagnation.test.js
const { computeStagnation, countActive, STAGNATION_DAYS } = require('../utils/computeStagnation');

const NOW = new Date('2026-05-01T12:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);

describe('computeStagnation', () => {
  test('archivedAsStagnant => never auto-stagnant', () => {
    const app = {
      archivedAsStagnant: true,
      lastEventAt: daysAgo(60),
      lastEventType: 'application_submitted',
    };
    expect(computeStagnation(app, NOW).isStagnant).toBe(false);
  });

  test('outbound + over threshold => stagnant', () => {
    const app = {
      lastEventAt: daysAgo(STAGNATION_DAYS + 1),
      lastEventType: 'application_submitted',
    };
    expect(computeStagnation(app, NOW).isStagnant).toBe(true);
  });

  test('outbound exactly at threshold => stagnant', () => {
    const app = {
      lastEventAt: daysAgo(STAGNATION_DAYS),
      lastEventType: 'cover_letter_sent',
    };
    expect(computeStagnation(app, NOW).isStagnant).toBe(true);
  });

  test('outbound below threshold => not stagnant', () => {
    const app = {
      lastEventAt: daysAgo(STAGNATION_DAYS - 1),
      lastEventType: 'application_submitted',
    };
    expect(computeStagnation(app, NOW).isStagnant).toBe(false);
  });

  test('two-way event (interview) past threshold => not stagnant', () => {
    const app = {
      lastEventAt: daysAgo(60),
      lastEventType: 'interview',
    };
    expect(computeStagnation(app, NOW).isStagnant).toBe(false);
  });

  test('phone call past threshold => not stagnant', () => {
    const app = {
      lastEventAt: daysAgo(60),
      lastEventType: 'phone',
    };
    expect(computeStagnation(app, NOW).isStagnant).toBe(false);
  });

  test('falls back to createdAt when no events', () => {
    const app = {
      createdAt: daysAgo(STAGNATION_DAYS + 5),
      lastEventType: 'none',
    };
    expect(computeStagnation(app, NOW).isStagnant).toBe(true);
  });

  test('reports daysSinceLastEvent', () => {
    const app = {
      lastEventAt: daysAgo(10),
      lastEventType: 'application_submitted',
    };
    expect(computeStagnation(app, NOW).daysSinceLastEvent).toBe(10);
  });

  test('null app => safe defaults', () => {
    expect(computeStagnation(null, NOW)).toEqual({
      isStagnant: false,
      daysSinceLastEvent: null,
      basisDate: null,
    });
  });
});

describe('countActive', () => {
  test('parked rows do not count', () => {
    const apps = [
      { archivedAsStagnant: false, stillInterested: true },
      { archivedAsStagnant: true, stillInterested: true },
      { archivedAsStagnant: false, stillInterested: false },
      { archivedAsStagnant: false, stillInterested: true },
    ];
    expect(countActive(apps)).toBe(2);
  });
  test('empty list', () => {
    expect(countActive([])).toBe(0);
    expect(countActive(null)).toBe(0);
  });
});
