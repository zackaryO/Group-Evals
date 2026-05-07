// server/utils/followupSuggestion.js
//
// Rule-based hint shown on each application row. Pure function from
// (application state, now) -> { suggestion, urgency } | null. The UI displays
// the suggestion as a soft hint; nothing is enforced server-side.
//
// Rules (first match wins):
//   - lastEventType === 'interview' AND <24h since: "Send thank-you note today"
//   - lastEventType === 'interview' AND 24-72h since: "Send thank-you note ASAP"
//   - lastEventType === 'application_submitted' AND >=7 days: "Follow up by phone or email"
//   - lastEventType === 'cover_letter_sent' AND >=7 days: "Follow up to confirm receipt"
//   - lastEventType === 'email_sent' AND >=10 days: "Try a different channel"
//   - applicationSubmitted is false AND application is older than 14 days: "Submit your application"
//   - lastEventType === 'offer_received': "Respond to the offer"
//   - otherwise null

const MS_PER_HOUR = 1000 * 60 * 60;
const MS_PER_DAY = MS_PER_HOUR * 24;

function hoursSince(date, now) {
  if (!date) return null;
  return (new Date(now).getTime() - new Date(date).getTime()) / MS_PER_HOUR;
}

function daysSince(date, now) {
  if (!date) return null;
  return (new Date(now).getTime() - new Date(date).getTime()) / MS_PER_DAY;
}

function followupSuggestion(application, now = new Date()) {
  if (!application) return null;
  if (application.archivedAsStagnant) return null;

  const lastType = application.lastEventType || 'none';
  const lastH = hoursSince(application.lastEventAt, now);
  const lastD = lastH != null ? lastH / 24 : null;

  if (lastType === 'offer_received') {
    return { suggestion: 'Respond to the offer', urgency: 'high' };
  }
  if (lastType === 'interview') {
    if (lastH != null && lastH < 24) {
      return { suggestion: 'Send a thank-you note today', urgency: 'high' };
    }
    if (lastH != null && lastH < 72) {
      return { suggestion: 'Send a thank-you note ASAP', urgency: 'high' };
    }
    return { suggestion: 'Confirm next step with the dealer', urgency: 'medium' };
  }
  if (lastType === 'application_submitted' && lastD != null && lastD >= 7) {
    return { suggestion: 'Follow up by phone or email', urgency: 'medium' };
  }
  if (lastType === 'cover_letter_sent' && lastD != null && lastD >= 7) {
    return { suggestion: 'Follow up to confirm receipt', urgency: 'medium' };
  }
  if (lastType === 'email_sent' && lastD != null && lastD >= 10) {
    return { suggestion: 'Try a different channel (phone or in-person)', urgency: 'medium' };
  }

  if (!application.applicationSubmitted) {
    const ageD = daysSince(application.createdAt, now);
    if (ageD != null && ageD >= 14) {
      return { suggestion: 'Submit your application', urgency: 'medium' };
    }
  }

  return null;
}

module.exports = { followupSuggestion };
