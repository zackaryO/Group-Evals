// ClassBoard — instructor-focused summary of every student's job-search progress.
// Answers questions like:
//   - How many dealerships has each student selected?
//   - Has each dealership got at least one named contact w/ email?
//   - How many of the dealerships have had cover letter / resume sent?
//   - How many have progressed PAST sending? (zero past 6 days = red)
//   - Any official offer received yet?
//   - Does this student need a follow-up nudge? (green 7–13d, yellow 14d+)
//
// Pay-related fields are server-redacted for non-self / non-staff viewers.
//
// Mobile (< 768px): vertical stack of cards.
// Desktop (>= 768px): sortable HTML table.

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './jobSearchApi';
import './JobSearch.css';

const SORTABLE_COLS = [
  { key: 'studentName', label: 'Student' },
  { key: 'cohort', label: 'Cohort' },
  { key: 'dealerCount', label: 'Dealers' },
  { key: 'dealersWithContact', label: 'Contacts (name + email)' },
  { key: 'coverLetterSentCount', label: 'Resume / cover sent' },
  { key: 'pastSendingCount', label: 'Engaged' },
  { key: 'hasOffer', label: 'Offer?' },
  { key: 'followUpUrgency', label: 'Nudge' },
];

const ClassBoard = ({ user }) => {
  const navigate = useNavigate();
  const isStaff = !!user && (user.role === 'instructor' || user.role === 'admin');
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState('studentName');
  const [sortDir, setSortDir] = useState('asc');
  // 'all' | 'active' | 'inactive' | <cohortId>
  const [cohortFilter, setCohortFilter] = useState('all');

  const goToStudent = (studentId) => {
    if (!isStaff) return;
    navigate(`/job-search/student/${studentId}`);
  };
  const studentNameLink = (row) =>
    isStaff ? (
      <button
        type="button"
        onClick={() => goToStudent(row.studentId)}
        style={{
          background: 'none', border: 0, padding: 0, color: '#1d4ed8',
          textDecoration: 'underline', cursor: 'pointer', font: 'inherit', textAlign: 'inherit',
        }}
      >
        {row.studentName}
      </button>
    ) : (
      row.studentName
    );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getBoard().then((data) => { if (!cancelled) { setBoard(data); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Unique cohorts referenced by board rows, for the dropdown.
  const cohortOptions = useMemo(() => {
    const seen = new Map();
    board.forEach((r) => {
      if (r.cohortId) {
        seen.set(String(r.cohortId), { _id: r.cohortId, name: r.cohort, isActive: r.cohortActive !== false });
      }
    });
    return Array.from(seen.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [board]);

  const isRowInactive = (r) => r.studentActive === false || r.cohortActive === false;

  // Sort comparator that knows how to compare boolean / null-aware.
  const cmp = (av, bv, dir) => {
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av;
    }
    if (typeof av === 'boolean' && typeof bv === 'boolean') {
      return dir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    }
    const sa = String(av).toLowerCase();
    const sb = String(bv).toLowerCase();
    if (sa < sb) return dir === 'asc' ? -1 : 1;
    if (sa > sb) return dir === 'asc' ? 1 : -1;
    return 0;
  };

  const sorted = useMemo(() => {
    let copy = [...board];
    if (cohortFilter !== 'all') {
      copy = copy.filter((r) => {
        if (cohortFilter === 'active') return !isRowInactive(r);
        if (cohortFilter === 'inactive') return isRowInactive(r);
        return String(r.cohortId || '') === String(cohortFilter);
      });
    }
    copy.sort((a, b) => cmp(a[sortKey], b[sortKey], sortDir));
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      return copy.filter((r) =>
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.cohort || '').toLowerCase().includes(q)
      );
    }
    return copy;
  }, [board, sortKey, sortDir, filterText, cohortFilter]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  // ---- Cell renderers ------------------------------------------------------

  // "Engaged" count cell — dealers where the dealer has actually responded
  // (email reply, in-person/virtual meeting, interview, offer, rejection).
  //   - count > 0 → green positive badge (good progress, easy to scan for)
  //   - count = 0 with cover letter sent 6+ days ago → red flag
  //   - count = 0 otherwise → plain text
  const renderPastSending = (row) => {
    if (row.pastSendingCount > 0) {
      return (
        <span
          className="js-board-flag-positive"
          title={`${row.pastSendingCount} dealer${row.pastSendingCount === 1 ? '' : 's'} engaged in real two-way contact (email reply, meeting, interview, etc.)`}
        >
          ✓ {row.pastSendingCount}
        </span>
      );
    }
    if (row.zeroPastSendingPast6Days) {
      return (
        <span className="js-board-flag-red" title="Zero engaged dealers after 6+ days since sending the cover letter">
          0
        </span>
      );
    }
    return <span>0</span>;
  };

  // Yes/No pill for "official offer received."
  const renderOffer = (row) => (
    <span className={row.hasOffer ? 'js-board-pill ok' : 'js-board-pill muted'}>
      {row.hasOffer ? 'Yes' : 'No'}
    </span>
  );

  // Nudge cell. We deliberately suppress 'wait' on the board (per spec):
  // the board is for outstanding tasks only.
  const renderNudge = (row) => {
    const u = row.followUpUrgency;
    if (!u || u === 'wait') return <span style={{ color: '#9ca3af' }}>—</span>;
    if (u === 'demand') {
      return <span className="js-nudge-chip demand">Follow up now</span>;
    }
    return <span className="js-nudge-chip encourage">Time to follow up</span>;
  };

  const renderContacts = (row) => {
    const total = row.dealerCount;
    const ok = row.dealersWithContact;
    const incomplete = total > 0 && ok < total;
    return (
      <span className={incomplete ? 'js-board-flag-red' : ''} title={incomplete ? 'Some dealers are missing a name + email contact' : ''}>
        {ok} / {total}
      </span>
    );
  };

  const renderCoverLetters = (row) => {
    const total = row.dealerCount;
    const ok = row.coverLetterSentCount;
    const missing = Math.max(0, total - ok);
    if (missing > 0) {
      return (
        <span className="js-board-flag-critical" title={`${missing} dealer${missing === 1 ? '' : 's'} still need the cover letter / resume sent — critical first step`}>
          ⚠ {ok} / {total} ({missing} missing)
        </span>
      );
    }
    return <span>{ok} / {total}</span>;
  };

  // Whole-row tint. "Missing cover letters" outranks every other tier — the
  // student hasn't taken the critical first step on at least one dealer, so
  // the row glows bright red regardless of the follow-up nudge state.
  const rowNudgeClass = (row) => {
    if (row.dealerCount > 0 && row.coverLetterSentCount < row.dealerCount) return 'js-row-missing';
    const u = row.followUpUrgency;
    if (!u || u === 'wait') return '';
    return u === 'demand' ? 'js-row-demand' : 'js-row-encourage';
  };

  return (
    <div className="js-page">
      <h2 style={{ marginTop: 0 }}>Class job-search board</h2>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        Pay info is hidden for everyone except the student who owns the row and instructors.{' '}
        <strong style={{ color: '#b91c1c' }}>Bright red row</strong> = student has at least one dealer where the
        cover letter / resume hasn't been sent yet (critical first step).{' '}
        <strong>Yellow</strong> = 14+ days since send without follow-up.{' '}
        <strong>Green</strong> = 7–13 days (good time to follow up).
      </div>

      <div className="js-board-filters">
        <input
          type="text"
          placeholder="Filter by name or cohort"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8, minHeight: 44, fontSize: 16 }}
        />
        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          style={{ padding: 10, border: '1px solid #d1d5db', borderRadius: 8, minHeight: 44, fontSize: 14 }}
          aria-label="Cohort filter"
        >
          <option value="all">All cohorts</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
          {cohortOptions.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}{c.isActive === false ? ' (inactive)' : ''}
            </option>
          ))}
        </select>
        <span style={{ fontSize: 13, color: '#4b5563' }}>{sorted.length} students</span>
      </div>

      {loading ? (
        <div className="js-loading">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="js-empty">No students to show.</div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="js-show-mobile">
            <div className="js-board-cards">
              {sorted.map((row) => {
                const inactive = isRowInactive(row);
                const tint = rowNudgeClass(row);
                return (
                <div
                  key={row.studentId}
                  className={`js-board-card ${tint}`}
                  style={inactive ? { opacity: 0.55, color: '#6b7280' } : undefined}
                >
                  <div className="name">
                    {studentNameLink(row)}
                    {inactive ? <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>(inactive)</span> : null}
                  </div>
                  <div className="meta">
                    {row.cohort || '— no cohort —'}
                    {row.cohortActive === false ? ' (inactive)' : ''}
                  </div>
                  <div className="stat"><strong>{row.dealerCount}</strong> dealers</div>
                  <div className="stat">Contacts: {renderContacts(row)}</div>
                  <div className="stat">Resume / cover sent: {renderCoverLetters(row)}</div>
                  <div className="stat">Past sending: {renderPastSending(row)}</div>
                  <div className="stat">Offer received: {renderOffer(row)}</div>
                  <div className="stat" style={{ gridColumn: '1 / -1' }}>
                    Nudge: {renderNudge(row)}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Desktop: sortable table */}
          <div className="js-show-desktop" style={{ overflowX: 'auto' }}>
            <table className="js-board-table">
              <thead>
                <tr>
                  {SORTABLE_COLS.map((col) => (
                    <th key={col.key} onClick={() => onSort(col.key)}>
                      {col.label} {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const inactive = isRowInactive(row);
                  const tint = rowNudgeClass(row);
                  const rowStyle = inactive ? { opacity: 0.55, color: '#6b7280' } : undefined;
                  return (
                  <tr key={row.studentId} className={tint} style={rowStyle}>
                    <td>
                      {studentNameLink(row)}
                      {inactive ? ' (inactive)' : ''}
                    </td>
                    <td>
                      {row.cohort || '—'}
                      {row.cohortActive === false ? ' (inactive)' : ''}
                    </td>
                    <td>{row.dealerCount}</td>
                    <td>{renderContacts(row)}</td>
                    <td>{renderCoverLetters(row)}</td>
                    <td>{renderPastSending(row)}</td>
                    <td>{renderOffer(row)}</td>
                    <td>{renderNudge(row)}</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ClassBoard;
