import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register'; // For instructors to add users
import EvaluationForm from './components/Evaluation/EvaluationForm.jsx';
import Gradebook from './components/Evaluation/Gradebook.jsx';
import DefineAreas from './components/Instructor/DefineAreas';
import ManageStudents from './components/Instructor/ManageStudents';
import PrivateRoute from './components/Auth/PrivateRoute';
import InstructorRoute from './components/Auth/InstructorRoute';

const App = () => {
  const [user, setUser] = useState(null);

  console.log('User in App:', user); // Log the user object in App

  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login setUser={setUser} />} />
        <Route path="/register" element={<PrivateRoute user={user} role="instructor"><Register user={user} /></PrivateRoute>} /> {/* Accessible only to instructors */}
        <Route path="/" element={<PrivateRoute user={user}><Home user={user} /></PrivateRoute>} />
        <Route path="/evaluation" element={<PrivateRoute user={user}><EvaluationForm user={user} /></PrivateRoute>} />
        <Route path="/gradebook" element={<PrivateRoute user={user}><Gradebook user={user} /></PrivateRoute>} />
        <Route path="/define-areas" element={<InstructorRoute user={user}><DefineAreas user={user} /></InstructorRoute>} /> {/* Accessible only to instructors */}
        <Route path="/manage-students" element={<InstructorRoute user={user}><ManageStudents user={user} /></InstructorRoute>} /> {/* Accessible only to instructors */}
      </Routes>
    </Router>
  );
};

export default App;
