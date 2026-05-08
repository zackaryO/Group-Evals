// server/utils/followUpUrgency.js
//
// Computes a per-application "follow-up nudge" tier from how long it's been
// since the student sent the cover letter / resume — and whether any
// follow-up activity has occurred since then.
//
// Tiers:
//   - 'wait'      : 0–6 days since send → "don't follow up yet"
//   - 'encourage' : 7–13 days → "good time to reach back out"
//   - 'demand'    : 14+ days → "follow up now"
//   -  null       : not applicable (cover letter/resume not yet sent, parked,
//                   or follow-up has already taken place)
//
// "Cover letter / resume sent" reuses the existing applicationSubmitted /
// applicationSubmittedAt fields — those fire either when the student logs an
// 'application_submitted' communication or when they toggle the highlighted
// yes/no in the dealer panel.
//
// "Follow-up has occurred" = the most recent communication on the app
// happened AFTER applicationSubmittedAt and is NOT another send (i.e. not
// 'application_submitted' or 'cover_letter_sent'). Anything else — phone,
// email_sent, email_received, in-person visit, interview, offer, rejection —
// counts as "the student progressed past send."

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Confirmed dealer-side participation. Phone calls, student-sent emails,
// texts, and "other" events deliberately don't qualify — they could be
// voicemails, unanswered messages, or informational inquiries.
const ENGAGEMENT_TYPES = new Set([
  'email_received',
  'virtual_meeting',
  'in_person',
  'interview',
  'offer_received',
  'rejection',
]);

function followUpUrgency(application, now = new Date()) {
  if (!application) return null;
  if (application.archivedAsStagnant) return null;
  if (!application.applicationSubmitted || !application.applicationSubmittedAt) return null;

  // Engaged dealers (confirmed two-way contact) skip the nudge column.
  if (application.lastEventType && ENGAGEMENT_TYPES.has(application.lastEventType)) {
    return null;
  }

  // Anchor the clock to the most recent student action so a follow-up
  // attempt (phone, text, email_sent) resets the wait timer even though
  // those don't count as engagement.
  const submittedMs = new Date(application.applicationSubmittedAt).getTime();
  const lastMs = application.lastEventAt ? new Date(application.lastEventAt).getTime() : null;
  let anchorMs = submittedMs;
  if (lastMs != null && lastMs > anchorMs) anchorMs = lastMs;
  if (Number.isNaN(anchorMs)) return null;

  const days = Math.floor((now.getTime() - anchorMs) / MS_PER_DAY);
  if (days < 0) return null;
  if (days <= 6) return 'wait';
  if (days <= 13) return 'encourage';
  return 'demand';
}

module.exports = { followUpUrgency, ENGAGEMENT_TYPES };
