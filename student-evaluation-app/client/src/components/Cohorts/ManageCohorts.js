// student-evaluation-app/client/src/components/Cohorts/ManageCohorts.js
//
// Full cohort management page for instructors:
//  - Create / edit / delete cohorts
//  - Activate / deactivate cohorts (with optional cascade to all students in
//    the cohort). Inactive cohorts and students render greyed out everywhere
//    in the instructor UI but remain fully functional for the user.
//  - Assign / unassign students to a cohort
//  - Toggle individual student active state
//
// All inactive entities are styled with the `inactive-row` class which is
// defined in ManageCohorts.css.

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import URL from '../../backEndURL';
import './ManageCohorts.css';

const ManageCohorts = () => {
  const [cohorts, setCohorts] = useState([]);
  const [students, setStudents] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Create form
  const [newName, setNewName] = useState('');
  const [newGradDate, setNewGradDate] = useState('');

  // Per-cohort edit state. Keyed by cohort id.
  const [edits, setEdits] = useState({});

  // Per-cohort "assign student" dropdown selection.
  const [assignSelections, setAssignSelections] = useState({});

  // Per-cohort expand toggle so the page isn't a wall of names.
  const [expanded, setExpanded] = useState({});

  const fetchAll = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };
      const [cohortsRes, studentsRes] = await Promise.all([
        axios.get(`${URL}/api/cohorts`),
        axios.get(`${URL}/api/users/students`, config),
      ]);
      setCohorts(cohortsRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      setMessage('Error loading cohort data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const studentsById = useMemo(() => {
    const m = new Map();
    students.forEach((s) => m.set(String(s._id), s));
    return m;
  }, [students]);

  const unassignedStudents = useMemo(
    () => students.filter((s) => !s.cohort),
    [students]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${URL}/api/cohorts`, {
        name: newName,
        gradDate: newGradDate,
      });
      setCohorts((prev) => [...prev, { ...res.data, students: [] }]);
      setNewName('');
      setNewGradDate('');
      setMessage(`Cohort "${res.data.name}" created.`);
    } catch (error) {
      setMessage('Error creating cohort: ' + (error.response?.data?.message || error.message));
    }
  };

  const startEdit = (cohort) => {
    const dateStr = cohort.gradDate ? new Date(cohort.gradDate).toISOString().slice(0, 10) : '';
    setEdits((prev) => ({ ...prev, [cohort._id]: { name: cohort.name, gradDate: dateStr } }));
  };

  const cancelEdit = (cohortId) => {
    setEdits((prev) => {
      const next = { ...prev };
      delete next[cohortId];
      return next;
    });
  };

  const saveEdit = async (cohortId) => {
    const draft = edits[cohortId];
    if (!draft) return;
    try {
      const res = await axios.put(`${URL}/api/cohorts/${cohortId}`, {
        name: draft.name,
        gradDate: draft.gradDate,
      });
      setCohorts((prev) =>
        prev.map((c) => (c._id === cohortId ? { ...c, name: res.data.name, gradDate: res.data.gradDate } : c))
      );
      cancelEdit(cohortId);
      setMessage('Cohort updated.');
    } catch (error) {
      setMessage('Error updating cohort: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSetActive = async (cohort, isActive) => {
    let cascade = false;
    if (cohort.students && cohort.students.length > 0) {
      cascade = window.confirm(
        `Also mark all ${cohort.students.length} student(s) in "${cohort.name}" as ${isActive ? 'active' : 'inactive'}?`
      );
    }
    try {
      const res = await axios.put(`${URL}/api/cohorts/${cohort._id}/active`, { isActive, cascade });
      setCohorts((prev) => prev.map((c) => (c._id === cohort._id ? res.data : c)));
      if (cascade) {
        const ids = new Set((cohort.students || []).map((s) => String(s._id)));
        setStudents((prev) =>
          prev.map((s) => (ids.has(String(s._id)) ? { ...s, isActive } : s))
        );
      }
      setMessage(`Cohort "${cohort.name}" ${isActive ? 'activated' : 'deactivated'}.`);
    } catch (error) {
      setMessage('Error updating cohort: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDelete = async (cohort) => {
    if (!window.confirm(`Delete cohort "${cohort.name}"? Students will be unassigned but not deleted.`)) return;
    try {
      await axios.delete(`${URL}/api/cohorts/${cohort._id}`);
      setCohorts((prev) => prev.filter((c) => c._id !== cohort._id));
      // Unassign these students locally so they appear in the unassigned pool.
      const ids = new Set((cohort.students || []).map((s) => String(s._id)));
      setStudents((prev) =>
        prev.map((s) => (ids.has(String(s._id)) ? { ...s, cohort: null } : s))
      );
      setMessage(`Cohort "${cohort.name}" deleted.`);
    } catch (error) {
      setMessage('Error deleting cohort: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleStudentActive = async (studentId, isActive) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };
      await axios.put(`${URL}/api/users/${studentId}/active`, { isActive }, config);
      setStudents((prev) =>
        prev.map((s) => (String(s._id) === String(studentId) ? { ...s, isActive } : s))
      );
      // Reflect in the cohort.students embedded list as well.
      setCohorts((prev) =>
        prev.map((c) => ({
          ...c,
          students: (c.students || []).map((s) =>
            String(s._id) === String(studentId) ? { ...s, isActive } : s
          ),
        }))
      );
    } catch (error) {
      setMessage('Error updating student: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAssignStudent = async (cohortId) => {
    const studentId = assignSelections[cohortId];
    if (!studentId) return;
    try {
      const token = localStorage.getItem('token');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };
      await axios.put(`${URL}/api/users/${studentId}/assign-cohort`, { cohortId }, config);
      // Move locally.
      const student = studentsById.get(String(studentId));
      if (student) {
        setStudents((prev) =>
          prev.map((s) => (String(s._id) === String(studentId) ? { ...s, cohort: cohortId } : s))
        );
        setCohorts((prev) =>
          prev.map((c) => {
            if (c._id !== cohortId) return c;
            const exists = (c.students || []).some((s) => String(s._id) === String(studentId));
            if (exists) return c;
            return { ...c, students: [...(c.students || []), {
              _id: student._id,
              firstName: student.firstName,
              lastName: student.lastName,
              username: student.username,
              isActive: student.isActive !== false,
            }] };
          })
        );
      }
      setAssignSelections((prev) => ({ ...prev, [cohortId]: '' }));
      setMessage('Student assigned.');
    } catch (error) {
      setMessage('Error assigning student: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleUnassign = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: token ? { Authorization: `Bearer ${token}` } : {} };
      await axios.put(`${URL}/api/users/${studentId}/assign-cohort`, { cohortId: null }, config);
      setStudents((prev) =>
        prev.map((s) => (String(s._id) === String(studentId) ? { ...s, cohort: null } : s))
      );
      setCohorts((prev) =>
        prev.map((c) => ({
          ...c,
          students: (c.students || []).filter((s) => String(s._id) !== String(studentId)),
        }))
      );
    } catch (error) {
      setMessage('Error unassigning student: ' + (error.response?.data?.message || error.message));
    }
  };

  const sortedCohorts = useMemo(() => {
    const copy = [...cohorts];
    copy.sort((a, b) => {
      // Active first, then by grad date desc, then name.
      if (!!b.isActive !== !!a.isActive) return a.isActive ? -1 : 1;
      const ad = a.gradDate ? new Date(a.gradDate).getTime() : 0;
      const bd = b.gradDate ? new Date(b.gradDate).getTime() : 0;
      if (bd !== ad) return bd - ad;
      return (a.name || '').localeCompare(b.name || '');
    });
    return copy;
  }, [cohorts]);

  if (loading) return <p>Loading cohorts…</p>;

  return (
    <div className="manage-cohorts-container">
      <h2>Manage Cohorts</h2>
      {message && <p className="mc-message">{message}</p>}

      <section className="mc-section">
        <h3>Create new cohort</h3>
        <form className="mc-create-form" onSubmit={handleCreate}>
          <label>
            Name:
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </label>
          <label>
            Grad date:
            <input
              type="date"
              value={newGradDate}
              onChange={(e) => setNewGradDate(e.target.value)}
              required
            />
          </label>
          <button type="submit">Create</button>
        </form>
      </section>

      <section className="mc-section">
        <h3>Cohorts ({sortedCohorts.length})</h3>
        {sortedCohorts.length === 0 ? (
          <p>No cohorts yet.</p>
        ) : (
          <ul className="mc-cohort-list">
            {sortedCohorts.map((cohort) => {
              const isActive = cohort.isActive !== false;
              const isEditing = !!edits[cohort._id];
              const isOpen = !!expanded[cohort._id];
              return (
                <li
                  key={cohort._id}
                  className={`mc-cohort-card ${isActive ? '' : 'inactive-row'}`}
                >
                  <div className="mc-cohort-header">
                    {isEditing ? (
                      <div className="mc-edit-fields">
                        <input
                          type="text"
                          value={edits[cohort._id].name}
                          onChange={(e) =>
                            setEdits((p) => ({ ...p, [cohort._id]: { ...p[cohort._id], name: e.target.value } }))
                          }
                        />
                        <input
                          type="date"
                          value={edits[cohort._id].gradDate}
                          onChange={(e) =>
                            setEdits((p) => ({ ...p, [cohort._id]: { ...p[cohort._id], gradDate: e.target.value } }))
                          }
                        />
                      </div>
                    ) : (
                      <div className="mc-cohort-meta">
                        <strong className="mc-cohort-name">{cohort.name}</strong>
                        <span className="mc-cohort-date">
                          {cohort.gradDate ? `Grad: ${new Date(cohort.gradDate).toLocaleDateString()}` : '—'}
                        </span>
                        <span className={`mc-status ${isActive ? 'active' : 'inactive'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="mc-count">{(cohort.students || []).length} students</span>
                      </div>
                    )}

                    <div className="mc-cohort-actions">
                      {isEditing ? (
                        <>
                          <button onClick={() => saveEdit(cohort._id)}>Save</button>
                          <button onClick={() => cancelEdit(cohort._id)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setExpanded((p) => ({ ...p, [cohort._id]: !isOpen }))}>
                            {isOpen ? 'Hide students' : 'Show students'}
                          </button>
                          <button onClick={() => startEdit(cohort)}>Edit</button>
                          {isActive ? (
                            <button onClick={() => handleSetActive(cohort, false)}>Deactivate</button>
                          ) : (
                            <button onClick={() => handleSetActive(cohort, true)}>Reactivate</button>
                          )}
                          <button className="mc-danger" onClick={() => handleDelete(cohort)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mc-cohort-body">
                      <div className="mc-assign-row">
                        <label>
                          Assign student:
                          <select
                            value={assignSelections[cohort._id] || ''}
                            onChange={(e) =>
                              setAssignSelections((p) => ({ ...p, [cohort._id]: e.target.value }))
                            }
                          >
                            <option value="">— pick one —</option>
                            {unassignedStudents.map((s) => (
                              <option key={s._id} value={s._id}>
                                {s.firstName} {s.lastName} ({s.username})
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          onClick={() => handleAssignStudent(cohort._id)}
                          disabled={!assignSelections[cohort._id]}
                        >
                          Add to cohort
                        </button>
                      </div>

                      {(cohort.students || []).length === 0 ? (
                        <p className="mc-empty">No students in this cohort.</p>
                      ) : (
                        <ul className="mc-student-list">
                          {(cohort.students || []).map((s) => {
                            // Prefer the up-to-date record from the students fetch.
                            const fresh = studentsById.get(String(s._id)) || s;
                            const studentActive = fresh.isActive !== false;
                            return (
                              <li
                                key={s._id}
                                className={`mc-student-row ${studentActive ? '' : 'inactive-row'}`}
                              >
                                <span className="mc-student-name">
                                  {fresh.firstName} {fresh.lastName}
                                  <span className="mc-student-username"> ({fresh.username})</span>
                                </span>
                                <span className="mc-student-actions">
                                  <button
                                    onClick={() => handleToggleStudentActive(s._id, !studentActive)}
                                  >
                                    {studentActive ? 'Mark inactive' : 'Mark active'}
                                  </button>
                                  <button onClick={() => handleUnassign(s._id)}>Unassign</button>
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mc-section">
        <h3>Unassigned students ({unassignedStudents.length})</h3>
        {unassignedStudents.length === 0 ? (
          <p className="mc-empty">All students are assigned to a cohort.</p>
        ) : (
          <ul className="mc-student-list">
            {unassignedStudents.map((s) => {
              const studentActive = s.isActive !== false;
              return (
                <li
                  key={s._id}
                  className={`mc-student-row ${studentActive ? '' : 'inactive-row'}`}
                >
                  <span className="mc-student-name">
                    {s.firstName} {s.lastName}
                    <span className="mc-student-username"> ({s.username})</span>
                  </span>
                  <span className="mc-student-actions">
                    <button onClick={() => handleToggleStudentActive(s._id, !studentActive)}>
                      {studentActive ? 'Mark inactive' : 'Mark active'}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ManageCohorts;
