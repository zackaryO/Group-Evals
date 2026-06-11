// student-evaluation-app\client\src\components\Quizzes\ManageQuizzes.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import URL from '../../backEndURL';
import './ManageQuizzes.css';
import { isFullInstructor } from '../../utils/roles';

/**
 * ManageQuizzes Component
 *
 * Role-aware quiz manager. Quizzes are split into two groups:
 *  - "Editable" — quizzes the user can manage (full instructors: all; electrical
 *    instructors: ones they own + quizzes flagged shared, e.g. "A6 ASE practice 1").
 *  - "View only" — everything else (other instructors' quizzes), shown read-only.
 *
 * Electrical instructors can delete only quizzes they own, and assign owned/
 * shared quizzes to their electrical-student roster. Only full instructors can
 * publish globally or flag a quiz as shared.
 */
const ManageQuizzes = ({ user }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [message, setMessage] = useState('');

  const fullInstructor = isFullInstructor(user?.role);
  const myId = String(user?._id);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await axios.get(`${URL}/api/quizzes`, authHeaders());
        setQuizzes(response.data);
      } catch (error) {
        setMessage('Error fetching quizzes: ' + (error.response?.data?.message || error.message));
      }
    };
    fetchQuizzes();
  }, []);

  // ─────────────────────────── Per-quiz permission helpers
  const ownsQuiz = (quiz) => String(quiz.instructor) === myId;
  const canEdit = (quiz) => fullInstructor || ownsQuiz(quiz) || !!quiz.sharedWithElectrical;
  const canDelete = (quiz) => fullInstructor || ownsQuiz(quiz);
  const isAssignedToMe = (quiz) =>
    (quiz.electricalAssignedBy || []).some((id) => String(id) === myId);

  const ownerLabel = (quiz) => {
    if (ownsQuiz(quiz)) return 'Created by you';
    if (quiz.sharedWithElectrical) return 'Shared quiz';
    return 'Another instructor';
  };
  const ownerBadgeClass = (quiz) => {
    if (ownsQuiz(quiz)) return 'mq-badge-owner';
    if (quiz.sharedWithElectrical) return 'mq-badge-shared';
    return 'mq-badge-other';
  };

  const replaceQuiz = (updated) =>
    setQuizzes((prev) => prev.map((q) => (q._id === updated._id ? updated : q)));

  // ─────────────────────────── Actions
  const handlePublishToggle = async (quizId) => {
    try {
      const response = await axios.put(`${URL}/api/quizzes/${quizId}/publish`, {}, authHeaders());
      replaceQuiz(response.data);
      setMessage(
        `Quiz "${response.data.title}" is now ${response.data.isPublished ? 'published' : 'unpublished'} for regular students.`
      );
    } catch (error) {
      setMessage('Error updating quiz: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleSharedToggle = async (quiz) => {
    try {
      const response = await axios.put(
        `${URL}/api/quizzes/${quiz._id}/shared-electrical`,
        { sharedWithElectrical: !quiz.sharedWithElectrical },
        authHeaders()
      );
      replaceQuiz(response.data);
      setMessage(
        `Quiz "${response.data.title}" is ${response.data.sharedWithElectrical ? 'now shared with' : 'no longer shared with'} electrical instructors.`
      );
    } catch (error) {
      setMessage('Error updating quiz: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleElectricalAssignToggle = async (quiz) => {
    try {
      const response = await axios.put(
        `${URL}/api/quizzes/${quiz._id}/electrical-assign`,
        { assign: !isAssignedToMe(quiz) },
        authHeaders()
      );
      replaceQuiz(response.data);
      setMessage(
        `Quiz "${response.data.title}" is ${isAssignedToMe(response.data) ? 'now assigned to' : 'no longer assigned to'} your A6 Prep students.`
      );
    } catch (error) {
      setMessage('Error assigning quiz: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAllowMultipleSubmissionsToggle = async (quizId, currentValue) => {
    try {
      const response = await axios.put(
        `${URL}/api/quizzes/${quizId}/toggle-multiple-submissions`,
        { allowMultipleSubmissions: !currentValue },
        authHeaders()
      );
      replaceQuiz(response.data);
      setMessage(
        `Allow multiple submissions for quiz "${response.data.title}" is now ${response.data.allowMultipleSubmissions ? 'enabled' : 'disabled'}.`
      );
    } catch (error) {
      setMessage('Error updating quiz: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Delete this quiz and all its questions and submissions? This cannot be undone.')) return;
    try {
      await axios.delete(`${URL}/api/quizzes/${quizId}`, authHeaders());
      setQuizzes((prev) => prev.filter((quiz) => quiz._id !== quizId));
      setMessage('Quiz deleted successfully.');
    } catch (error) {
      setMessage('Error deleting quiz: ' + (error.response?.data?.message || error.message));
    }
  };

  // ─────────────────────────── Card renderers
  const renderEditableCard = (quiz) => {
    const assigned = isAssignedToMe(quiz);
    return (
      <div key={quiz._id} className="mq-card">
        <h3 className="mq-card-title">{quiz.title}</h3>

        <div className="mq-badges">
          <span className={`mq-badge ${ownerBadgeClass(quiz)}`}>{ownerLabel(quiz)}</span>
          {fullInstructor && (
            <span className={`mq-badge ${quiz.isPublished ? 'mq-badge-published' : 'mq-badge-unpublished'}`}>
              {quiz.isPublished ? 'Published' : 'Unpublished'}
            </span>
          )}
          {assigned && <span className="mq-badge mq-badge-assigned">Assigned to your students</span>}
        </div>

        <div className="mq-actions">
          {fullInstructor && (
            <button type="button" className="mq-btn mq-btn-publish" onClick={() => handlePublishToggle(quiz._id)}>
              {quiz.isPublished ? 'Unpublish' : 'Publish'}
            </button>
          )}
          <button
            type="button"
            className={`mq-btn mq-btn-assign ${assigned ? 'is-assigned' : ''}`}
            onClick={() => handleElectricalAssignToggle(quiz)}
          >
            {assigned ? 'Unassign from students' : 'Assign to my students'}
          </button>
          <Link to={`/manage-questions/${quiz._id}`} className="mq-btn mq-btn-neutral">
            Manage Questions
          </Link>
          {canDelete(quiz) && (
            <button type="button" className="mq-btn mq-btn-danger" onClick={() => handleDeleteQuiz(quiz._id)}>
              Delete
            </button>
          )}
        </div>

        <div className="mq-footer">
          {fullInstructor && (
            <label className="mq-toggle">
              <input
                type="checkbox"
                checked={!!quiz.sharedWithElectrical}
                onChange={() => handleSharedToggle(quiz)}
              />
              Shared with electrical instructors
            </label>
          )}
          <label className="mq-toggle">
            <input
              type="checkbox"
              checked={quiz.allowMultipleSubmissions}
              onChange={() => handleAllowMultipleSubmissionsToggle(quiz._id, quiz.allowMultipleSubmissions)}
            />
            Allow multiple submissions
          </label>
        </div>
      </div>
    );
  };

  const renderReadonlyCard = (quiz) => (
    <div key={quiz._id} className="mq-card mq-card-readonly">
      <h3 className="mq-card-title">{quiz.title}</h3>
      <div className="mq-badges">
        <span className="mq-badge mq-badge-other">Another instructor</span>
      </div>
      <p className="mq-readonly-note">View only — you can’t edit or assign this quiz.</p>
      <div className="mq-actions">
        <Link to={`/manage-questions/${quiz._id}`} className="mq-btn mq-btn-neutral">
          View questions
        </Link>
      </div>
    </div>
  );

  const editableQuizzes = quizzes.filter((q) => canEdit(q));
  const readonlyQuizzes = quizzes.filter((q) => !canEdit(q));

  return (
    <div className="manage-quizzes-container">
      <h2>Manage Quizzes</h2>
      {!fullInstructor && (
        <p className="manage-quizzes-hint">
          You can edit quizzes you created and the shared practice quiz, and view the rest. Other
          instructors’ quizzes are shown read-only. Use “Assign to my students” to make a quiz
          available to the A6 Prep students you added.
        </p>
      )}
      {message && <p className="mq-message">{message}</p>}

      {quizzes.length === 0 && <p className="mq-empty">No quizzes yet.</p>}

      {editableQuizzes.length > 0 && (
        <section className="mq-section">
          <div className="mq-section-header">
            <span className="mq-section-title">
              {fullInstructor ? 'All Quizzes' : 'Quizzes you can manage'}
            </span>
            <span className="mq-section-count">{editableQuizzes.length}</span>
          </div>
          <div className="mq-grid">{editableQuizzes.map(renderEditableCard)}</div>
        </section>
      )}

      {readonlyQuizzes.length > 0 && (
        <section className="mq-section">
          <div className="mq-section-header">
            <span className="mq-section-title">View only — other instructors</span>
            <span className="mq-section-count">{readonlyQuizzes.length}</span>
          </div>
          <div className="mq-grid">{readonlyQuizzes.map(renderReadonlyCard)}</div>
        </section>
      )}
    </div>
  );
};

export default ManageQuizzes;
