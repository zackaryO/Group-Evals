// student-evaluation-app/client/src/App.js

import React, { useState, useEffect } from 'react';
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
import EvalGradebook from './components/Evaluation/Gradebook'; // Import EvalGradebook component (same as original Gradebook)
import PrivateRoute from './components/Auth/PrivateRoute';
import InstructorRoute from './components/Auth/InstructorRoute';

const App = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const storedRole = localStorage.getItem('role');
    if (storedUserId && storedRole) {
      setUser({
        _id: storedUserId,
        role: storedRole,
      });
    }
  }, []);

  return (
    <Router>
      <Navbar user={user} />
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<PrivateRoute user={user} role="instructor"><Register user={user} /></PrivateRoute>} />
        <Route path="/" element={<PrivateRoute user={user}><Home user={user} /></PrivateRoute>} />
        <Route path="/home" element={<PrivateRoute user={user}><Home user={user} /></PrivateRoute>} /> {/* Set as default route */}
        <Route path="/evaluation" element={<PrivateRoute user={user}><EvaluationForm user={user} /></PrivateRoute>} />
        <Route path="/gradebook" element={<PrivateRoute user={user}><Gradebook user={user} /></PrivateRoute>} />
        <Route path="/define-areas" element={<InstructorRoute user={user}><DefineAreas user={user} /></InstructorRoute>} />
        <Route path="/manage-students" element={<InstructorRoute user={user}><ManageStudents user={user} /></InstructorRoute>} />
        <Route path="/create-quiz" element={<InstructorRoute user={user}><CreateQuiz user={user} /></InstructorRoute>} />
        <Route path="/manage-quizzes" element={<InstructorRoute user={user}><ManageQuizzes user={user} /></InstructorRoute>} />
        <Route path="/manage-questions/:quizId" element={<InstructorRoute user={user}><ManageQuestions /></InstructorRoute>} />
        <Route path="/take-quiz" element={<PrivateRoute user={user} role="student"><TakeQuiz user={user} /></PrivateRoute>} />
        <Route path="/quiz-gradebook" element={<PrivateRoute user={user}><QuizGradebook user={user} /></PrivateRoute>} />
        <Route path="/eval-gradebook" element={<PrivateRoute user={user}><EvalGradebook user={user} /></PrivateRoute>} /> {/* Retained Gradebook as EvalGradebook */}
      </Routes>
    </Router>
  );
};

export default App;
