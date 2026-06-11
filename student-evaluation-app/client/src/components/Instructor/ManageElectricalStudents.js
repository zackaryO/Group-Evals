// student-evaluation-app/client/src/components/Instructor/ManageElectricalStudents.js
//
// Electrical-student roster manager. Used by electrical instructors (to manage
// the students they added) and full instructors (who see all electrical
// students). Electrical students are restricted accounts that only see quizzes
// assigned to their roster plus their own results.

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import URL from '../../backEndURL';
import { isFullInstructor } from '../../utils/roles';
import './ManageElectricalStudents.css';

const emptyForm = {
  username: '',
  password: '',
  firstName: '',
  lastName: '',
};

const ManageElectricalStudents = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const fullInstructor = isFullInstructor(user?.role);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const refresh = async () => {
    try {
      const res = await axios.get(`${URL}/api/users/electrical-students`, { headers: authHeaders() });
      setStudents(res.data);
    } catch (err) {
      setMessage('Error loading: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        // Edit existing student (name / password). Role stays electrical_student.
        const payload = {
          username: form.username,
          firstName: form.firstName,
          lastName: form.lastName,
        };
        if (form.password) payload.password = form.password;
        await axios.put(`${URL}/api/users/${editId}`, payload, { headers: authHeaders() });
        setMessage(`Student "${form.username}" updated.`);
      } else {
        const payload = { ...form, role: 'electrical_student' };
        await axios.post(`${URL}/api/users/add`, payload, { headers: authHeaders() });
        setMessage(`A6 Prep student "${form.username}" added.`);
      }
      resetForm();
      refresh();
    } catch (err) {
      setMessage('Error saving student: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleEdit = (student) => {
    setEditId(student._id);
    setMessage('');
    setForm({
      username: student.username || '',
      password: '',
      firstName: student.firstName || '',
      lastName: student.lastName || '',
    });
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Delete this A6 Prep student and all their scores? This cannot be undone.')) return;
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

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      const an = `${a.lastName || ''}${a.firstName || ''}`.toLowerCase();
      const bn = `${b.lastName || ''}${b.firstName || ''}`.toLowerCase();
      return an.localeCompare(bn);
    });
  }, [students]);

  const addedByName = (s) => {
    if (!s.addedBy) return '—';
    if (typeof s.addedBy === 'string') return s.addedBy;
    const { firstName, lastName, username } = s.addedBy;
    return `${firstName || ''} ${lastName || ''}`.trim() || username || '—';
  };

  if (loading) return <p style={{ padding: 20 }}>Loading…</p>;

  const colCount = fullInstructor ? 5 : 4;

  return (
    <div className="es-page">
      <h2>A6 Prep Students</h2>
      <p className="es-intro">
        A6 Prep students only see the quizzes you assign to them (plus the shared practice quiz)
        and their own results. Assign quizzes from <Link to="/manage-quizzes">Manage Quizzes</Link>;
        view their scores in the <Link to="/quiz-gradebook">Quiz Gradebook</Link>.
      </p>

      {message && <p className="es-message">{message}</p>}

      <table className="es-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Username</th>
            {fullInstructor && <th>Added by</th>}
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedStudents.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="es-empty">No A6 Prep students yet.</td>
            </tr>
          ) : sortedStudents.map((s) => {
            const inactive = s.isActive === false;
            return (
              <tr key={s._id} className={inactive ? 'es-row-inactive' : ''}>
                <td>{s.firstName} {s.lastName}{inactive ? ' (inactive)' : ''}</td>
                <td>{s.username}</td>
                {fullInstructor && <td>{addedByName(s)}</td>}
                <td>{inactive ? 'Inactive' : 'Active'}</td>
                <td>
                  <button type="button" className="es-tbtn" onClick={() => handleEdit(s)}>Edit</button>
                  <button type="button" className="es-tbtn" onClick={() => handleToggleActive(s)}>
                    {inactive ? 'Mark active' : 'Mark inactive'}
                  </button>
                  <button type="button" className="es-tbtn es-tbtn-danger" onClick={() => handleDelete(s._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="es-card">
        <h3>{editId ? 'Edit A6 Prep student' : 'Add new A6 Prep student'}</h3>
        <form className="es-form" onSubmit={handleSubmit}>
          <div className="es-field">
            <label htmlFor="es-username">Username</label>
            <input
              id="es-username"
              className="es-input"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="es-field">
            <label htmlFor="es-password">Password{editId ? ' (leave blank to keep)' : ''}</label>
            <input
              id="es-password"
              className="es-input"
              type="password"
              required={!editId}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className="es-field">
            <label htmlFor="es-first">First name</label>
            <input
              id="es-first"
              className="es-input"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </div>
          <div className="es-field">
            <label htmlFor="es-last">Last name</label>
            <input
              id="es-last"
              className="es-input"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </div>
          <div className="es-actions">
            <button type="submit" className="es-btn es-btn-primary">
              {editId ? 'Update student' : 'Add student'}
            </button>
            {editId && (
              <button type="button" className="es-btn es-btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ManageElectricalStudents;
