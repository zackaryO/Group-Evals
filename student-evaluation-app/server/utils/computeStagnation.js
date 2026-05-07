// server/utils/computeStagnation.js
//
// Stagnation is *computed*, never persisted. An application is stagnant when:
//   - it is NOT explicitly archivedAsStagnant by the student (that's a separate
//     parking flag — those rows stay in the list deliberately), AND
//   - more than STAGNATION_DAYS have passed since lastEventAt, AND
//   - lastEventType is one of the "outbound, awaiting reply" types (the student
//     sent something and got nothing back). Communications like 'phone' or
//     'interview' are two-way and don't count as stagnant on their own.
//
// `archivedAsStagnant` rows are still kept on the list per requirements
// ("must not get removed as some may just be waiting until graduation"); they
// just don't count toward the 6 active dealers and are not auto-stagnant.

const STAGNATION_DAYS = 21;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const OUTBOUND_AWAITING_TYPES = new Set([
  'application_submitted',
  'cover_letter_sent',
  'email_sent',
  'text',
  'none', // never had any event = also "awaiting" if old enough
]);

function daysBetween(later, earlier) {
  if (!later || !earlier) return null;
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / MS_PER_DAY);
}

// Returns { isStagnant, daysSinceLastEvent, basisDate }
// `basisDate` is the date stagnation is measured from (lastEventAt, or createdAt when no events yet).
function computeStagnation(application, now = new Date()) {
  if (!application) return { isStagnant: false, daysSinceLastEvent: null, basisDate: null };
  if (application.archivedAsStagnant) {
    return { isStagnant: false, daysSinceLastEvent: null, basisDate: null };
  }

  const basis = application.lastEventAt || application.createdAt || null;
  const days = daysBetween(now, basis);
  const lastType = application.lastEventType || 'none';

  if (days === null) return { isStagnant: false, daysSinceLastEvent: null, basisDate: basis };
  if (!OUTBOUND_AWAITING_TYPES.has(lastType)) {
    return { isStagnant: false, daysSinceLastEvent: days, basisDate: basis };
  }
  return {
    isStagnant: days >= STAGNATION_DAYS,
    daysSinceLastEvent: days,
    basisDate: basis,
  };
}

// Counts how many of a student's applications are "active" — i.e. not parked
// (archivedAsStagnant) and not stillInterested === false. Stagnant rows still
// count as active until the student parks them.
function countActive(applications) {
  return (applications || []).filter(
    (app) => !app.archivedAsStagnant && app.stillInterested !== false
  ).length;
}

module.exports = {
  STAGNATION_DAYS,
  computeStagnation,
  countActive,
  // exported for tests
  _OUTBOUND_AWAITING_TYPES: OUTBOUND_AWAITING_TYPES,
};
