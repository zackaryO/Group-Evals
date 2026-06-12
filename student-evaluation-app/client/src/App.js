// student-evaluation-app/client/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { isTokenValid } from './utils/auth';
import { forceLogoutAndRedirect, clearAuthStorage } from './authInterceptor';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/RegisterUser';
import EvaluationForm from './components/Evaluation/EvaluationForm';
import Gradebook from './components/Evaluation/Gradebook';
import DefineAreas from './components/Instructor/DefineAreas';
import ManageStudents from './components/Instructor/ManageStudents';
import CreateQuiz from './components/Quizzes/CreateQuiz';
import ManageQuizzes from './components/Quizzes/ManageQuizzes';
import ManageQuestions from './components/Quizzes/ManageQuestions';
import TakeQuiz from './components/Quizzes/TakeQuiz';
import QuizGradebook from './components/Quizzes/QuizGradebook';
import EvalGradebook from './components/Evaluation/Gradebook';
import MissedQuestions from './components/Quizzes/MissedQuestions';
import PrivateRoute from './components/Auth/PrivateRoute';
import InstructorRoute from './components/Auth/InstructorRoute';
import CreateCourse from './components/Courses/CreateCourse';
import ManageCourses from './components/Courses/ManageCourses';
import AttachAssessments from './components/Courses/AttachAssessments';
import PostAssignment from './components/Assignments/PostAssignment';
import AssignmentSubmission from './components/Assignments/AssignmentSubmission';
import AssignmentGradebook from './components/Assignments/AssignmentGradebook';
import CourseGradebook from './components/Gradebooks/CourseGradebook';
import MasterGradebook from './components/Gradebooks/MasterGradebook';
import StudentDashboard from './components/Student/StudentDashboard';
import CreateCohort from './components/Cohorts/CreateCohort';
import ManageCohorts from './components/Cohorts/ManageCohorts';
import AssignStudents from './components/Cohorts/AssignStudents';
import ManageUsers from './components/Instructor/ManageUsers';
import ManageElectricalStudents from './components/Instructor/ManageElectricalStudents';
import ResumeBuilder from './components/Instructor/ResumeBuilder';

// NEW: Import Inventory Pages
import ToolsPage from './components/Inventory/ToolsPage';
import LoanerToolboxesPage from './components/Inventory/LoanerToolboxesPage';
import SparePartsPage from './components/Inventory/SparePartsPage';
import InstructorToolsPage from './components/Inventory/InstructorToolsPage';
import ConsumablesPage from './components/Inventory/ConsumablesPage';
import FacilityNeedsPage from './components/Inventory/FacilityNeedsPage';
import TrainingVehiclesPage from './components/Inventory/TrainingVehiclesPage';
import InventoryReportsPage from './components/Inventory/InventoryReportsPage';

// NEW: Job Search tracker pages
import MyJobSearch from './components/JobSearch/MyJobSearch';
import ClassBoard from './components/JobSearch/ClassBoard';

const App = () => {
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');
    const storedRole = localStorage.getItem('role');
    const storedFirstName = localStorage.getItem('firstName');
    const storedLastName = localStorage.getItem('lastName');
    const storedUsername = localStorage.getItem('username');

    const sanitize = (value) => (value && value !== 'undefined' ? value : '');

    if (storedToken && storedUserId && storedRole) {
      return {
        _id: storedUserId,
        role: storedRole,
        username: sanitize(storedUsername),
        firstName: sanitize(storedFirstName),
        lastName: sanitize(storedLastName),
      };
    }

    return null;
  });

  // Session watchdog: the route guards block navigation to protected pages once
  // a token is expired, but a user can also be sitting idle on an already-open
  // page (making no API calls) when their 2h token lapses. This polls the token
  // and, the moment it's expired, clears the stale session and bounces to
  // /login — so no page stays viewable past expiry. We also re-check on tab
  // focus / visibility so a laptop reopened "days later" redirects at once.
  useEffect(() => {
    const enforceSession = () => {
      const token = localStorage.getItem('token');
      if (!token) return; // not logged in — nothing to enforce
      if (isTokenValid(token)) return; // still valid

      // Expired/invalid. If we're already on the login screen, just purge the
      // stale creds quietly; otherwise force a full logout + redirect.
      if (window.location.pathname === '/login') {
        clearAuthStorage();
        setUser(null);
      } else {
        forceLogoutAndRedirect('session_expired');
      }
    };

    enforceSession();
    const intervalId = setInterval(enforceSession, 30 * 1000);
    window.addEventListener('focus', enforceSession);
    document.addEventListener('visibilitychange', enforceSession);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', enforceSession);
      document.removeEventListener('visibilitychange', enforceSession);
    };
  }, []);

  return (
    <Router>
      <Navbar user={user} />
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route
          path="/register"
          element={
            <PrivateRoute user={user}>
              <Register user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute user={user} allowElectricalStudent allowElectricalInstructor allowSupportStaff>
              <Home user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute user={user} allowElectricalStudent allowElectricalInstructor allowSupportStaff>
              <Home user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/evaluation"
          element={
            <PrivateRoute user={user} allowSupportStaff>
              <EvaluationForm user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/gradebook"
          element={
            <PrivateRoute user={user} allowSupportStaff>
              <Gradebook user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/define-areas"
          element={
            <InstructorRoute user={user}>
              <DefineAreas user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-students"
          element={
            <InstructorRoute user={user}>
              <ManageStudents user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/create-quiz"
          element={
            <InstructorRoute user={user} roles={['instructor', 'admin', 'electrical_instructor']}>
              <CreateQuiz user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-quizzes"
          element={
            <InstructorRoute user={user} roles={['instructor', 'admin', 'electrical_instructor']}>
              <ManageQuizzes user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-questions/:quizId"
          element={
            <InstructorRoute user={user} roles={['instructor', 'admin', 'electrical_instructor']}>
              <ManageQuestions />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-electrical-students"
          element={
            <InstructorRoute user={user} roles={['instructor', 'admin', 'electrical_instructor']}>
              <ManageElectricalStudents user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/take-quiz"
          element={
            <PrivateRoute user={user} allowElectricalStudent>
              <TakeQuiz user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/quiz-gradebook"
          element={
            <PrivateRoute user={user} allowElectricalStudent allowElectricalInstructor allowSupportStaff>
              <QuizGradebook user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/eval-gradebook"
          element={
            <PrivateRoute user={user} allowSupportStaff>
              <EvalGradebook user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/missed-questions"
          element={
            <InstructorRoute user={user}>
              <MissedQuestions />
            </InstructorRoute>
          }
        />
        <Route
          path="/create-course"
          element={
            <InstructorRoute user={user}>
              <CreateCourse user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-courses"
          element={
            <InstructorRoute user={user}>
              <ManageCourses user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/attach-assessments"
          element={
            <InstructorRoute user={user}>
              <AttachAssessments user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/post-assignment"
          element={
            <InstructorRoute user={user}>
              <PostAssignment user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/submit-assignment/:assignmentId"
          element={
            <PrivateRoute user={user}>
              <AssignmentSubmission user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/assignment-gradebook/:assignmentId"
          element={
            <InstructorRoute user={user}>
              <AssignmentGradebook user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/course-gradebook"
          element={
            <PrivateRoute user={user}>
              <CourseGradebook user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/master-gradebook"
          element={
            <InstructorRoute user={user}>
              <MasterGradebook user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute user={user}>
              <StudentDashboard user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/create-cohort"
          element={
            <InstructorRoute user={user}>
              <CreateCohort user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-cohorts"
          element={
            <InstructorRoute user={user}>
              <ManageCohorts user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/assign-students"
          element={
            <InstructorRoute user={user}>
              <AssignStudents user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/course-gradebook/:courseId"
          element={
            <PrivateRoute user={user}>
              <CourseGradebook user={user} />
            </PrivateRoute>
          }
        />

        <Route
          path="/resume-builder"
          element={
            <PrivateRoute user={user} allowSupportStaff>
              <ResumeBuilder />
            </PrivateRoute>
          }
        />

        <Route
          path="/manage-users"
          element={
            <InstructorRoute user={user}>
              <ManageUsers user={user} />
            </InstructorRoute>
          }
        />

        {/* NEW: Inventory pages, Instructor-only */}
        <Route
          path="/tools"
          element={
            <InstructorRoute user={user}>
              <ToolsPage />
            </InstructorRoute>
          }
        />
        <Route
          path="/loaner-toolboxes"
          element={
            <InstructorRoute user={user}>
              <LoanerToolboxesPage />
            </InstructorRoute>
          }
        />
        <Route
          path="/spare-parts"
          element={
            <InstructorRoute user={user}>
              <SparePartsPage />
            </InstructorRoute>
          }
        />
        <Route
          path="/instructor-tools"
          element={
            <InstructorRoute user={user}>
              <InstructorToolsPage />
            </InstructorRoute>
          }
        />
        <Route
          path="/consumables"
          element={
            <InstructorRoute user={user}>
              <ConsumablesPage />
            </InstructorRoute>
          }
        />
        <Route
          path="/facility-needs"
          element={
            <InstructorRoute user={user}>
              <FacilityNeedsPage />
            </InstructorRoute>
          }
        />
        <Route
          path="/training-vehicles"
          element={
            <InstructorRoute user={user}>
              <TrainingVehiclesPage />
            </InstructorRoute>
          }
        />
        <Route
          path="/inventory-reports"
          element={
            <InstructorRoute user={user}>
              <InventoryReportsPage />
            </InstructorRoute>
          }
        />

        {/* Job Search tracker — students manage their own; everyone sees the board */}
        <Route
          path="/job-search"
          element={
            <PrivateRoute user={user} allowSupportStaff>
              <MyJobSearch user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/job-search/board"
          element={
            <PrivateRoute user={user} allowSupportStaff>
              <ClassBoard user={user} />
            </PrivateRoute>
          }
        />
        {/* Staff drill-in: same MyJobSearch component, with a banner */}
        <Route
          path="/job-search/student/:studentId"
          element={
            <InstructorRoute user={user} roles={['instructor', 'admin', 'support_staff']}>
              <MyJobSearch user={user} />
            </InstructorRoute>
          }
        />
        {/* Catch-all: route unknown paths through the protected home, which
            redirects to /login when the session is missing or expired. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;





