// MyJobSearch — primary dashboard. Two modes:
//   1) Self  (route `/job-search`): user manages their own records. Works for
//      students AND staff (staff keep personal records as teaching examples).
//   2) Impersonation (route `/job-search/student/:studentId`, staff only):
//      staff views/edits a specific student's records. A blue banner makes
//      the impersonation visually unmistakable.
//
// Both modes share the same UI; the only differences are which API calls
// are made and the banner.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from './jobSearchApi';
import AddDealershipModal from './AddDealershipModal';
import DealerApplicationPanel from './DealerApplicationPanel';
import './JobSearch.css';

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function studentDisplayName(s) {
  if (!s) return 'this student';
  const full = [s.firstName, s.lastName].filter(Boolean).join(' ').trim();
  return full || s.username || 'this student';
}

// Single source of truth for "has the cover letter / resume been sent?"
// — the highlighted yes/no toggle in the modal AND any logged
// 'cover_letter_sent' or 'application_submitted' communication both count.
export const isCoverLetterSent = (app) =>
  !!(app && (
    app.applicationSubmitted
    || app.lastEventType === 'cover_letter_sent'
    || app.lastEventType === 'application_submitted'
  ));

// "Engagement" = the dealer has actually responded or a confirmed two-way
// event has taken place. A phone call alone doesn't qualify (could be a
// voicemail / unanswered / informational inquiry); same for student-initiated
// emails or texts where there's no guarantee of a reply. Only events where
// the dealer's participation is explicit count here.
const ENGAGEMENT_TYPES = new Set([
  'email_received',
  'virtual_meeting',
  'in_person',
  'interview',
  'offer_received',
  'rejection',
]);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Client-side mirror of the server's followUpUrgency util. Computing here
// (with lastEventAt as a fallback anchor) means we get a consistent tier
// for every app regardless of whether the server has the new
// applicationSubmittedAt populated yet — same color/text rules for every
// dealer in the same state.
//
// Returns one of:
//   'missing'    — cover letter has NOT been sent (critical first step)
//   'engaged'    — dealer has confirmed two-way contact (email reply, in-person
//                  visit, virtual meeting, interview, offer, or rejection).
//                  A phone call, student-sent email, text, or "other" event
//                  alone does NOT qualify — those could be voicemails,
//                  unanswered messages, or informational inquiries.
//   'wait'       — within 6 days of the most recent student action
//   'encourage'  — 7–13 days since the most recent student action
//   'demand'     — 14+ days since the most recent student action, no reply
//   null         — parked, or no longer pursuing
export const computeFollowUpUrgency = (app, now = Date.now()) => {
  if (!app || app.archivedAsStagnant) return null;
  if (app.stillInterested === false) return null;

  if (!isCoverLetterSent(app)) return 'missing';

  // 'engaged' requires confirmed dealer participation. Ambiguous events
  // (phone, text, email_sent, other) don't count — the student may simply
  // have left a voicemail or sent a message that was never read.
  if (app.lastEventType && ENGAGEMENT_TYPES.has(app.lastEventType)) {
    return 'engaged';
  }

  // Anchor the nudge clock to the most recent student action — either the
  // cover-letter send-date or any subsequent follow-up attempt (phone,
  // text, email_sent). That way a student who called yesterday gets a
  // fresh "wait" tier even if they sent the cover letter 3 weeks ago, and
  // they haven't been talked to / replied to yet.
  const submittedMs = app.applicationSubmittedAt
    ? new Date(app.applicationSubmittedAt).getTime() : null;
  const lastMs = app.lastEventAt ? new Date(app.lastEventAt).getTime() : null;
  let anchorMs = submittedMs;
  if (lastMs != null && (anchorMs == null || lastMs > anchorMs)) anchorMs = lastMs;
  if (anchorMs == null || Number.isNaN(anchorMs)) return 'wait';

  const days = Math.floor((now - anchorMs) / MS_PER_DAY);
  if (days < 0) return 'wait';
  if (days <= 6) return 'wait';
  if (days <= 13) return 'encourage';
  return 'demand';
};

// Single status row. The cover-letter / resume status is conveyed by the
// color-coded follow-up banner below — so it is intentionally NOT a pill
// here, to avoid redundant "Resume / cover sent" badges per the spec.
const StatusPills = ({ app }) => (
  <div className="js-app-status-row">
    {app.hasPostedJob === 'Y' && <span className="js-status-pill">Has posted job</span>}
    {app.benefits?.mentorship?.offered && <span className="js-status-pill">Mentorship</span>}
    {app.benefits?.relocation?.offered === 'Y' && <span className="js-status-pill">Relocation</span>}
    {app.archivedAsStagnant && <span className="js-status-pill muted">Parked</span>}
    {app.isStagnant && <span className="js-status-pill warn">Stagnant {app.daysSinceLastEvent}d</span>}
    {app.stillInterested === false && <span className="js-status-pill muted">Not pursuing</span>}
  </div>
);

// Banner shown on each dealer card based on days since cover letter / resume
// was sent. Spec: 'missing' = "send the cover letter / resume" (bright red,
// critical first step); 0–6d = "don't follow up yet" (light red); 7–13d =
// "good time to follow up" (green); 14d+ = "follow up now" (yellow). This
// banner IS the cover-letter-sent indicator — no separate pill.
const FollowUpBanner = ({ app }) => {
  const u = computeFollowUpUrgency(app);
  if (!u) return null;
  const text = u === 'missing'
    ? "Cover letter / resume not yet sent, this is the critical first step."
    : u === 'engaged'
      ? "Active conversation in progress, keep the dialogue going."
      : u === 'wait'
        ? "Resume / cover sent, give them about a week before following up."
        : u === 'encourage'
          ? "It's been a week, a friendly check-in could keep things moving."
          : "It's been two weeks, follow up now to keep this lead alive.";
  return (
    <div className={`js-followup-tier ${u}`} aria-label={`Follow-up status: ${u}`}>
      {text}
    </div>
  );
};

const ApplicationCard = ({
  app,
  index,
  total,
  onOpen,
  onMoveUp,
  onMoveDown,
  onArchive,
  onDelete,
  canEdit,
}) => {
  const urgency = computeFollowUpUrgency(app);
  const className = [
    'js-app-card',
    app.isStagnant ? 'is-stagnant' : '',
    app.archivedAsStagnant ? 'is-archived' : '',
    urgency ? `urgency-${urgency}` : '',
  ].filter(Boolean).join(' ');

  const lastEventLabel = app.lastEventType && app.lastEventType !== 'none'
    ? `${app.lastEventType.replace(/_/g, ' ')}${app.lastEventAt ? ` · ${new Date(app.lastEventAt).toLocaleDateString()}` : ''}`
    : 'No activity yet';

  return (
    <div className={className} onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(); }}>
      <div className="js-priority-badge" aria-label={`Priority ${index + 1}`}>{index + 1}</div>
      <div className="js-app-title">{app.dealerName}</div>
      <div className="js-app-meta">
        {[app.dealerCity, app.dealerState].filter(Boolean).join(', ') || '—'} · {lastEventLabel}
      </div>
      <StatusPills app={app} />
      <FollowUpBanner app={app} />
      {app.followupSuggestion && (
        <div className={`js-followup ${app.followupUrgency === 'high' ? 'high' : ''}`}>
          ↻ {app.followupSuggestion}
        </div>
      )}
      <div className="js-app-actions" onClick={(e) => e.stopPropagation()}>
        {canEdit && (
          <>
            <button type="button" className="js-reorder-btn" aria-label="Move up" disabled={index === 0} onClick={onMoveUp}>↑</button>
            <button type="button" className="js-reorder-btn" aria-label="Move down" disabled={index === total - 1} onClick={onMoveDown}>↓</button>
            <button type="button" className="js-btn sm" onClick={onArchive}>
              {app.archivedAsStagnant ? 'Unpark' : 'Park'}
            </button>
          </>
        )}
        <button type="button" className="js-btn sm" onClick={onOpen}>Open</button>
        {canEdit && (
          <button type="button" className="js-btn sm danger" onClick={onDelete}>Delete</button>
        )}
      </div>
    </div>
  );
};

const MyJobSearch = ({ user }) => {
  const params = useParams();
  const navigate = useNavigate();
  const targetStudentId = params.studentId || null;

  const isStaff = !!user && (user.role === 'instructor' || user.role === 'admin');
  const isImpersonating = !!targetStudentId && String(targetStudentId) !== String(user?._id);

  // Block non-staff impersonation attempts (defense-in-depth; the route element also gates it).
  useEffect(() => {
    if (isImpersonating && !isStaff) navigate('/job-search', { replace: true });
  }, [isImpersonating, isStaff, navigate]);

  const [jobSearch, setJobSearch] = useState(null);
  const [viewedStudent, setViewedStudent] = useState(null); // populated only when impersonating
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [openApplicationId, setOpenApplicationId] = useState(null);
  const [graduationDateInput, setGraduationDateInput] = useState('');
  const [savingGrad, setSavingGrad] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (isImpersonating) {
        const result = await api.getStudentJobSearch(targetStudentId);
        setJobSearch(result.jobSearch);
        setViewedStudent(result.student);
        if (result.jobSearch?.graduationDate) {
          setGraduationDateInput(result.jobSearch.graduationDate.slice(0, 10));
        } else {
          setGraduationDateInput('');
        }
        const apps = await api.listApplications(targetStudentId);
        setApplications(apps);
      } else {
        const [js, apps] = await Promise.all([api.getMyJobSearch(), api.listApplications()]);
        setJobSearch(js);
        setViewedStudent(null);
        if (js?.graduationDate) setGraduationDateInput(js.graduationDate.slice(0, 10));
        else setGraduationDateInput('');
        setApplications(apps);
      }
    } finally {
      setLoading(false);
    }
  }, [isImpersonating, targetStudentId]);

  useEffect(() => { reload(); }, [reload]);

  // Browser-level guard for an unsaved graduation date. Panel-level edits get
  // their own beforeunload handler in DealerApplicationPanel; this only fires
  // for the dashboard's grad-date input.
  useEffect(() => {
    const persisted = jobSearch?.graduationDate ? jobSearch.graduationDate.slice(0, 10) : '';
    const dirty = graduationDateInput !== persisted;
    if (!dirty) return undefined;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; return ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [graduationDateInput, jobSearch]);

  const activeCount = useMemo(
    () => applications.filter((a) => !a.archivedAsStagnant && a.stillInterested !== false).length,
    [applications]
  );
  const stagnantCount = useMemo(() => applications.filter((a) => a.isStagnant).length, [applications]);
  const daysToGrad = jobSearch?.graduationDate ? daysUntil(jobSearch.graduationDate) : null;

  const move = async (idx, delta) => {
    const next = idx + delta;
    if (next < 0 || next >= applications.length) return;
    const ordered = [...applications];
    const [item] = ordered.splice(idx, 1);
    ordered.splice(next, 0, item);
    setApplications(ordered);
    try {
      const updated = await api.reorderApplications(
        ordered.map((a) => a._id),
        isImpersonating ? targetStudentId : null
      );
      setApplications(updated);
    } catch {
      reload();
    }
  };

  const archive = async (app) => {
    const updated = await api.archiveApplication(app._id, !app.archivedAsStagnant);
    setApplications((cur) => cur.map((a) => (a._id === updated._id ? updated : a)));
  };

  const remove = async (app) => {
    if (!window.confirm(`Delete ${app.dealerName}? This permanently removes the application and all logged communications.`)) return;
    await api.deleteApplication(app._id);
    setApplications((cur) => cur.filter((a) => a._id !== app._id));
  };

  const saveGraduation = async () => {
    setSavingGrad(true);
    try {
      // updateMyJobSearch always edits the requester's own JobSearch container.
      // Staff editing a student's container would need a separate endpoint; in
      // practice the graduation date is owned by the student, so we hide the
      // editor when impersonating.
      const js = await api.updateMyJobSearch({ graduationDate: graduationDateInput || null });
      setJobSearch(js);
    } finally {
      setSavingGrad(false);
    }
  };

  const handleApplicationUpdated = (updated) => {
    setApplications((cur) => cur.map((a) => (a._id === updated._id ? updated : a)));
  };
  const handleApplicationDeleted = (id) => {
    setApplications((cur) => cur.filter((a) => a._id !== id));
    setOpenApplicationId(null);
  };

  if (loading) return <div className="js-page"><div className="js-loading">Loading…</div></div>;

  return (
    <div className="js-page">
      {isImpersonating && (
        <div className="js-staff-banner">
          <span>
            Staff mode — editing <strong>{studentDisplayName(viewedStudent)}</strong>'s job search.
          </span>
          <button type="button" className="js-btn" onClick={() => navigate('/job-search/board')}>
            Back to board
          </button>
          <button type="button" className="js-btn" onClick={() => navigate('/job-search')}>
            My own records
          </button>
        </div>
      )}

      <div className="js-stats">
        <div className="js-stat-card">
          <div className="js-stat-label">Days to grad</div>
          <div className="js-stat-value">
            {daysToGrad == null ? '—' : daysToGrad < 0 ? 'Past' : daysToGrad}
          </div>
        </div>
        <div className="js-stat-card">
          <div className="js-stat-label">Active</div>
          <div className={`js-stat-value ${activeCount < 6 ? 'js-stat-warn' : 'js-stat-ok'}`}>
            {activeCount} / 6
          </div>
        </div>
        <div className="js-stat-card">
          <div className="js-stat-label">Stagnant</div>
          <div className={`js-stat-value ${stagnantCount > 0 ? 'js-stat-warn' : ''}`}>{stagnantCount}</div>
        </div>
      </div>

      {!isImpersonating && (() => {
        const persistedDate = jobSearch?.graduationDate ? jobSearch.graduationDate.slice(0, 10) : '';
        const gradDirty = graduationDateInput !== persistedDate;
        return (
          <div className="js-form-row" style={{ marginBottom: 14 }}>
            <label htmlFor="grad-date">My target graduation date</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                id="grad-date"
                type="date"
                value={graduationDateInput}
                onChange={(e) => setGraduationDateInput(e.target.value)}
              />
              <button
                type="button"
                className={`js-btn primary ${gradDirty ? 'js-btn-dance' : ''}`}
                onClick={saveGraduation}
                disabled={savingGrad || !gradDirty}
              >
                {savingGrad ? 'Saving…' : gradDirty ? '● Save' : 'Saved'}
              </button>
            </div>
          </div>
        );
      })()}

      <div className="js-actionbar">
        <button type="button" className="js-btn primary" onClick={() => setShowAdd(true)}>
          + Add dealership
        </button>
        {activeCount < 6 && (
          <div className="js-callout">
            {isImpersonating ? 'This student is below 6 active dealers.' : `You're below 6 active dealers.`} {stagnantCount > 0 ? 'Add a replacement to get back to 6.' : 'Add another dealer to reach 6.'}
          </div>
        )}
        <div className="js-pay-note">Pay info is visible only to the student and instructors.</div>
      </div>

      {applications.length === 0 ? (
        <div className="js-empty">
          {isImpersonating
            ? 'This student has not added any dealerships yet.'
            : `You haven't added any dealerships yet. Click Add dealership above to start.`}
        </div>
      ) : (
        <div className="js-app-list">
          {applications.map((app, idx) => (
            <ApplicationCard
              key={app._id}
              app={app}
              index={idx}
              total={applications.length}
              canEdit={true /* both self-mode and staff-impersonation grant edit */}
              onOpen={() => setOpenApplicationId(app._id)}
              onMoveUp={() => move(idx, -1)}
              onMoveDown={() => move(idx, 1)}
              onArchive={() => archive(app)}
              onDelete={() => remove(app)}
            />
          ))}
        </div>
      )}

      <AddDealershipModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        targetStudentId={isImpersonating ? targetStudentId : null}
        targetStudentName={viewedStudent ? studentDisplayName(viewedStudent) : null}
        onCreated={(app) => setApplications((cur) => [...cur, app])}
      />

      {openApplicationId && (
        <DealerApplicationPanel
          applicationId={openApplicationId}
          user={user}
          impersonatingStudent={isImpersonating ? viewedStudent : null}
          onClose={() => setOpenApplicationId(null)}
          onUpdated={handleApplicationUpdated}
          onDeleted={handleApplicationDeleted}
        />
      )}
    </div>
  );
};

export default MyJobSearch;
