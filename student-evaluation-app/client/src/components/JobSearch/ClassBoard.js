// ClassBoard — public summary table of every student's job search progress.
// Pay-related fields (latestOfferAmount, highestStartingWage) are server-side
// redacted for non-self / non-staff viewers and rendered as "Hidden" here.
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
  { key: 'activeCount', label: 'Active' },
  { key: 'stagnantCount', label: 'Stagnant' },
  { key: 'parkedCount', label: 'Parked' },
  { key: 'latestEventAt', label: 'Last activity' },
  { key: 'nextStepType', label: 'Next step' },
];

const labelize = (s) => (s ? String(s).replace(/_/g, ' ') : '—');

const ClassBoard = ({ user }) => {
  const navigate = useNavigate();
  const isStaff = !!user && (user.role === 'instructor' || user.role === 'admin');
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [sortKey, setSortKey] = useState('studentName');
  const [sortDir, setSortDir] = useState('asc');

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

  const sorted = useMemo(() => {
    const copy = [...board];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // null/undefined sort to bottom regardless of direction
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      if (sa < sb) return sortDir === 'asc' ? -1 : 1;
      if (sa > sb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      return copy.filter((r) =>
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.cohort || '').toLowerCase().includes(q)
      );
    }
    return copy;
  }, [board, sortKey, sortDir, filterText]);

  const onSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const renderPay = (entry, key) => {
    const value = entry[key];
    if (value === null || value === undefined) {
      const ownerOrStaff = user && (user.role === 'instructor' || user.role === 'admin' || String(user._id) === String(entry.studentId));
      return ownerOrStaff ? '—' : <span className="js-board-redacted">Hidden</span>;
    }
    return `$${Number(value).toLocaleString()}`;
  };

  return (
    <div className="js-page">
      <h2 style={{ marginTop: 0 }}>Class job-search board</h2>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        Pay info (offers and wages) is hidden for everyone except the student who owns the row and instructors.
      </div>

      <div className="js-board-filters">
        <input
          type="text"
          className=""
          placeholder="Filter by name or cohort"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ flex: 1, padding: 10, border: '1px solid #d1d5db', borderRadius: 8, minHeight: 44, fontSize: 16 }}
        />
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
              {sorted.map((row) => (
                <div key={row.studentId} className="js-board-card">
                  <div className="name">{studentNameLink(row)}</div>
                  <div className="meta">{row.cohort || '— no cohort —'}</div>
                  <div className="stat"><strong>{row.activeCount}</strong> active</div>
                  <div className="stat">{row.stagnantCount} stagnant · {row.parkedCount} parked</div>
                  <div className="stat" style={{ gridColumn: '1 / -1' }}>
                    Last: {row.latestEventType ? labelize(row.latestEventType) : '—'}
                    {row.latestEventAt ? ` (${new Date(row.latestEventAt).toLocaleDateString()})` : ''}
                  </div>
                  <div className="stat" style={{ gridColumn: '1 / -1' }}>
                    Next: {labelize(row.nextStepType)}
                  </div>
                  <div className="stat" style={{ gridColumn: '1 / -1' }}>
                    Latest offer: {renderPay(row, 'latestOfferAmount')} · Highest wage: {renderPay(row, 'highestStartingWage')}
                  </div>
                </div>
              ))}
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
                  <th>Latest offer</th>
                  <th>Highest wage</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.studentId}>
                    <td>{studentNameLink(row)}</td>
                    <td>{row.cohort || '—'}</td>
                    <td>{row.activeCount}</td>
                    <td>{row.stagnantCount}</td>
                    <td>{row.parkedCount}</td>
                    <td>
                      {row.latestEventType ? labelize(row.latestEventType) : '—'}
                      {row.latestEventAt ? <div style={{ fontSize: 11, color: '#6b7280' }}>{new Date(row.latestEventAt).toLocaleDateString()}</div> : null}
                    </td>
                    <td>{labelize(row.nextStepType)}</td>
                    <td>{renderPay(row, 'latestOfferAmount')}</td>
                    <td>{renderPay(row, 'highestStartingWage')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ClassBoard;
