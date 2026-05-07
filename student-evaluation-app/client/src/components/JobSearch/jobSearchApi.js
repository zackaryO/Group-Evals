// Thin axios client for the Job Search API. Centralizes the auth-header dance
// and base URL so components don't have to repeat it.

import axios from 'axios';
import URL from '../../backEndURL';

function authHeaders() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

const api = {
  // JobSearch container
  getMyJobSearch: () => axios.get(`${URL}/api/job-search/me`, { headers: authHeaders() }).then((r) => r.data),
  updateMyJobSearch: (payload) =>
    axios.put(`${URL}/api/job-search/me`, payload, { headers: authHeaders() }).then((r) => r.data),

  // Staff-impersonation: returns { jobSearch, student } so the banner can label
  // whose record is being viewed without an extra request.
  getStudentJobSearch: (studentId) =>
    axios
      .get(`${URL}/api/job-search/student/${studentId}`, { headers: authHeaders() })
      .then((r) => r.data),

  // Applications
  listApplications: (studentId) => {
    const q = studentId ? `?student=${studentId}` : '';
    return axios.get(`${URL}/api/job-search/applications${q}`, { headers: authHeaders() }).then((r) => r.data);
  },
  getApplication: (id) =>
    axios.get(`${URL}/api/job-search/applications/${id}`, { headers: authHeaders() }).then((r) => r.data),
  // Pass `asStudentId` (staff-only) to create on behalf of a specific student.
  createApplication: (data, asStudentId) =>
    axios
      .post(
        `${URL}/api/job-search/applications`,
        asStudentId ? { ...data, student: asStudentId } : data,
        { headers: authHeaders() }
      )
      .then((r) => r.data),
  updateApplication: (id, data) =>
    axios.put(`${URL}/api/job-search/applications/${id}`, data, { headers: authHeaders() }).then((r) => r.data),
  archiveApplication: (id, archived) =>
    axios
      .put(`${URL}/api/job-search/applications/${id}/archive`, { archived }, { headers: authHeaders() })
      .then((r) => r.data),
  deleteApplication: (id) =>
    axios.delete(`${URL}/api/job-search/applications/${id}`, { headers: authHeaders() }).then((r) => r.data),
  reorderApplications: (orderedIds, asStudentId) =>
    axios
      .post(
        `${URL}/api/job-search/applications/reorder`,
        asStudentId ? { orderedIds, student: asStudentId } : { orderedIds },
        { headers: authHeaders() }
      )
      .then((r) => r.data),

  // Communications
  listCommunications: (applicationId) =>
    axios
      .get(`${URL}/api/job-search/applications/${applicationId}/communications`, { headers: authHeaders() })
      .then((r) => r.data),
  createCommunication: (applicationId, data) =>
    axios
      .post(`${URL}/api/job-search/applications/${applicationId}/communications`, data, {
        headers: authHeaders(),
      })
      .then((r) => r.data),
  updateCommunication: (commId, data) =>
    axios
      .put(`${URL}/api/job-search/communications/${commId}`, data, { headers: authHeaders() })
      .then((r) => r.data),
  deleteCommunication: (commId) =>
    axios
      .delete(`${URL}/api/job-search/communications/${commId}`, { headers: authHeaders() })
      .then((r) => r.data),

  // Class board
  getBoard: (cohort) => {
    const q = cohort ? `?cohort=${cohort}` : '';
    return axios.get(`${URL}/api/job-search/board${q}`, { headers: authHeaders() }).then((r) => r.data);
  },

  // Master directory (read-only for non-staff)
  searchDealerships: (search) =>
    axios
      .get(`${URL}/api/dealerships?search=${encodeURIComponent(search || '')}`, { headers: authHeaders() })
      .then((r) => r.data),

  // PDF
  timelinePdfUrl: (applicationId) =>
    `${URL}/api/job-search/applications/${applicationId}/timeline.pdf`,
};

export default api;
