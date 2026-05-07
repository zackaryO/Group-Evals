// __tests__/followupSuggestion.test.js
const { followupSuggestion } = require('../utils/followupSuggestion');

const NOW = new Date('2026-05-01T12:00:00Z');
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3600000);
const daysAgo = (d) => hoursAgo(d * 24);

describe('followupSuggestion', () => {
  test('null app => null', () => {
    expect(followupSuggestion(null, NOW)).toBeNull();
  });

  test('archived (parked) app => no hint', () => {
    expect(
      followupSuggestion(
        { archivedAsStagnant: true, lastEventType: 'interview', lastEventAt: hoursAgo(1) },
        NOW
      )
    ).toBeNull();
  });

  test('offer received => respond hint, high urgency', () => {
    const out = followupSuggestion(
      { lastEventType: 'offer_received', lastEventAt: daysAgo(1) },
      NOW
    );
    expect(out).toEqual({ suggestion: 'Respond to the offer', urgency: 'high' });
  });

  test('interview <24h => thank-you today', () => {
    const out = followupSuggestion(
      { lastEventType: 'interview', lastEventAt: hoursAgo(5) },
      NOW
    );
    expect(out.suggestion).toMatch(/thank-you/i);
    expect(out.urgency).toBe('high');
  });

  test('interview 36h ago => thank-you ASAP', () => {
    const out = followupSuggestion(
      { lastEventType: 'interview', lastEventAt: hoursAgo(36) },
      NOW
    );
    expect(out.suggestion).toMatch(/asap/i);
  });

  test('interview 5 days ago => confirm next step', () => {
    const out = followupSuggestion(
      { lastEventType: 'interview', lastEventAt: daysAgo(5) },
      NOW
    );
    expect(out.suggestion).toMatch(/next step/i);
    expect(out.urgency).toBe('medium');
  });

  test('application_submitted 7 days ago => follow up', () => {
    const out = followupSuggestion(
      { lastEventType: 'application_submitted', lastEventAt: daysAgo(7), applicationSubmitted: true },
      NOW
    );
    expect(out.suggestion).toMatch(/follow up/i);
  });

  test('application_submitted 6 days => no hint yet', () => {
    expect(
      followupSuggestion(
        { lastEventType: 'application_submitted', lastEventAt: daysAgo(6), applicationSubmitted: true },
        NOW
      )
    ).toBeNull();
  });

  test('cover_letter_sent 8 days => confirm receipt', () => {
    const out = followupSuggestion(
      { lastEventType: 'cover_letter_sent', lastEventAt: daysAgo(8) },
      NOW
    );
    expect(out.suggestion).toMatch(/receipt/i);
  });

  test('email_sent 12 days => try different channel', () => {
    const out = followupSuggestion(
      { lastEventType: 'email_sent', lastEventAt: daysAgo(12) },
      NOW
    );
    expect(out.suggestion).toMatch(/different channel/i);
  });

  test('not yet submitted, application 15 days old => prompt to submit', () => {
    const out = followupSuggestion(
      {
        applicationSubmitted: false,
        createdAt: daysAgo(15),
        lastEventType: 'none',
        lastEventAt: null,
      },
      NOW
    );
    expect(out.suggestion).toMatch(/submit/i);
  });

  test('fresh app => no hint', () => {
    expect(
      followupSuggestion(
        {
          applicationSubmitted: false,
          createdAt: daysAgo(2),
          lastEventType: 'none',
          lastEventAt: null,
        },
        NOW
      )
    ).toBeNull();
  });
});
