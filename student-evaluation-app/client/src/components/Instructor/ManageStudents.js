// student-evaluation-app/client/src/components/Instructor/ManageStudents.js
//
// Lightweight instructor view focused on students only — sortable list with
// cohort assignment, active-state toggle, and quick add. Distinct from
// ManageUsers (which covers all roles).

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';

const emptyForm = {
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  teamName: '',
  subject: '',
  cohortId: '',
};

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [cohortFilter, setCohortFilter] = useState('all');

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const refresh = async () => {
    try {
      const headers = authHeaders();
      const [studentsRes, cohortsRes] = await Promise.all([
        axios.get(`${URL}/api/users/students`, { headers }),
        axios.get(`${URL}/api/cohorts`),
      ]);
      setStudents(studentsRes.data);
      setCohorts(cohortsRes.data);
    } catch (err) {
      setMessage('Error loading: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const cohortById = useMemo(() => {
    const m = new Map();
    cohorts.forEach((c) => m.set(String(c._id), c));
    return m;
  }, [cohorts]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const headers = authHeaders();
      const payload = { ...form, role: 'student' };
      if (!payload.cohortId) delete payload.cohortId;
      await axios.post(`${URL}/api/users/add`, payload, { headers });
      setForm(emptyForm);
      setMessage(`Student "${payload.username}" added.`);
      refresh();
    } catch (err) {
      setMessage('Error adding student: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Delete this student and all their grades/evaluations? This cannot be undone.')) return;
    try {
      await axios.delete(`${URL}/api/users/${studentId}`, { headers: authHeaders() });
      setStudents((prev) => prev.filter((s) => s._id !== studentId));
      setMessage('Student deleted.');
    } catch (err) {
      setMessage('Error deleting: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleActive = async (student) => {
    const next = !(student.isActive !== false);
    try {
      await axios.put(
        `${URL}/api/users/${student._id}/active`,
        { isActive: next },
        { headers: authHeaders() }
      );
      setStudents((prev) =>
        prev.map((s) => (s._id === student._id ? { ...s, isActive: next } : s))
      );
    } catch (err) {
      setMessage('Error updating: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleAssignCohort = async (student, cohortId) => {
    try {
      await axios.put(
        `${URL}/api/users/${student._id}/assign-cohort`,
        { cohortId: cohortId || null },
        { headers: authHeaders() }
      );
      const cohort = cohortId ? cohortById.get(String(cohortId)) : null;
      setStudents((prev) =>
        prev.map((s) =>
          s._id === student._id
            ? { ...s, cohort: cohort ? { _id: cohort._id, name: cohort.name, isActive: cohort.isActive } : null }
            : s
        )
      );
    } catch (err) {
      setMessage('Error assigning cohort: ' + (err.response?.data?.message || err.message));
    }
  };

  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (cohortFilter === 'active') list = list.filter((s) => s.isActive !== false);
    else if (cohortFilter === 'inactive') list = list.filter((s) => s.isActive === false);
    else if (cohortFilter === 'unassigned') list = list.filter((s) => !s.cohort);
    else if (cohortFilter !== 'all') list = list.filter((s) => s.cohort && String(s.cohort._id) === String(cohortFilter));
    list.sort((a, b) => {
      const an = `${a.lastName || ''}${a.firstName || ''}`.toLowerCase();
      const bn = `${b.lastName || ''}${b.firstName || ''}`.toLowerCase();
      return an.localeCompare(bn);
    });
    return list;
  }, [students, cohortFilter]);

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto' }}>
      <h2>Manage Students</h2>
      {message && (
        <p style={{ background: '#eef2ff', border: '1px solid #c7d2fe', color: '#1e3a8a', padding: '8px 12px', borderRadius: 6 }}>
          {message}
        </p>
      )}

      <div style={{ margin: '12px 0', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 13 }}>
          Filter:&nbsp;
          <select value={cohortFilter} onChange={(e) => setCohortFilter(e.target.value)}>
            <option value="all">All ({students.length})</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="unassigned">Unassigned</option>
            {cohorts.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}{c.isActive === false ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </label>
        <span style={{ color: '#6b7280', fontSize: 13 }}>{filteredStudents.length} shown</span>
      </div>

      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#f3f4f6' }}>
            <th style={th}>Name</th>
            <th style={th}>Username</th>
            <th style={th}>Cohort</th>
            <th style={th}>Status</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredStudents.length === 0 ? (
            <tr><td colSpan={5} style={{ padding: 12, color: '#6b7280', fontStyle: 'italic' }}>No students.</td></tr>
          ) : filteredStudents.map((s) => {
            const studentInactive = s.isActive === false;
            const cohortInactive = s.cohort && s.cohort.isActive === false;
            const inactive = studentInactive || cohortInactive;
            const rowStyle = { ...td, ...(inactive ? { color: '#9ca3af', background: '#f9fafb' } : {}) };
            return (
              <tr key={s._id}>
                <td style={rowStyle}>
                  {s.firstName} {s.lastName}
                  {studentInactive ? ' (inactive)' : ''}
                </td>
                <td style={rowStyle}>{s.username}</td>
                <td style={rowStyle}>
                  <select
                    value={s.cohort ? String(s.cohort._id) : ''}
                    onChange={(e) => handleAssignCohort(s, e.target.value)}
                  >
                    <option value="">— none —</option>
                    {cohorts.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}{c.isActive === false ? ' (inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td style={rowStyle}>
                  {studentInactive ? 'Inactive' : 'Active'}
                </td>
                <td style={rowStyle}>
                  <button onClick={() => handleToggleActive(s)} style={btn}>
                    {studentInactive ? 'Mark active' : 'Mark inactive'}
                  </button>
                  <button onClick={() => handleDelete(s._id)} style={{ ...btn, color: '#b91c1c', borderColor: '#fecaca', background: '#fef2f2', marginLeft: 6 }}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h3>Add new student</h3>
      <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, background: '#f9fafb' }}>
        <label style={lbl}>Username
          <input required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={inp} />
        </label>
        <label style={lbl}>Password
          <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inp} />
        </label>
        <label style={lbl}>First name
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} style={inp} />
        </label>
        <label style={lbl}>Last name
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} style={inp} />
        </label>
        <label style={lbl}>Team
          <input value={form.teamName} onChange={(e) => setForm({ ...form, teamName: e.target.value })} style={inp} />
        </label>
        <label style={lbl}>Subject
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} style={inp} />
        </label>
        <label style={lbl}>Cohort
          <select value={form.cohortId} onChange={(e) => setForm({ ...form, cohortId: e.target.value })} style={inp}>
            <option value="">— none —</option>
            {cohorts.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}{c.isActive === false ? ' (inactive)' : ''}
              </option>
            ))}
          </select>
        </label>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button type="submit" style={{ ...btn, background: '#2563eb', color: '#fff', borderColor: '#2563eb', fontWeight: 600 }}>
            Add student
          </button>
        </div>
      </form>
    </div>
  );
};

const th = { border: '1px solid #e5e7eb', padding: 8, textAlign: 'left', fontWeight: 600, color: '#111827' };
const td = { border: '1px solid #e5e7eb', padding: 8, color: '#111827' };
const btn = { padding: '6px 10px', background: '#f3f4f6', color: '#111827', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 };
const lbl = { display: 'flex', flexDirection: 'column', fontSize: 13, color: '#374151' };
const inp = { marginTop: 4, padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 6 };

export default ManageStudents;
