// student-evaluation-app/client/src/App.js

import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
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

// NEW: Import Inventory Pages
import ToolsPage from './components/Inventory/ToolsPage';
import LoanerToolboxesPage from './components/Inventory/LoanerToolboxesPage';
import SparePartsPage from './components/Inventory/SparePartsPage';
import InstructorToolsPage from './components/Inventory/InstructorToolsPage';
import ConsumablesPage from './components/Inventory/ConsumablesPage';
import FacilityNeedsPage from './components/Inventory/FacilityNeedsPage';
import TrainingVehiclesPage from './components/Inventory/TrainingVehiclesPage';
import InventoryReportsPage from './components/Inventory/InventoryReportsPage';

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
            <PrivateRoute user={user}>
              <Home user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute user={user}>
              <Home user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/evaluation"
          element={
            <PrivateRoute user={user}>
              <EvaluationForm user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/gradebook"
          element={
            <PrivateRoute user={user}>
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
            <InstructorRoute user={user}>
              <CreateQuiz user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-quizzes"
          element={
            <InstructorRoute user={user}>
              <ManageQuizzes user={user} />
            </InstructorRoute>
          }
        />
        <Route
          path="/manage-questions/:quizId"
          element={
            <InstructorRoute user={user}>
              <ManageQuestions />
            </InstructorRoute>
          }
        />
        <Route
          path="/take-quiz"
          element={
            <PrivateRoute user={user}>
              <TakeQuiz user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/quiz-gradebook"
          element={
            <PrivateRoute user={user}>
              <QuizGradebook user={user} />
            </PrivateRoute>
          }
        />
        <Route
          path="/eval-gradebook"
          element={
            <PrivateRoute user={user}>
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
      </Routes>
    </Router>
  );
};

export default App;





