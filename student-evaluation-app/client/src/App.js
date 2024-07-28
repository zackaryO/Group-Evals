import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import EvaluationForm from './components/Evaluation/EvaluationForm';
import Gradebook from './components/Evaluation/Gradebook';
import DefineAreas from './components/Instructor/DefineAreas';
import ManageStudents from './components/Instructor/ManageStudents';
import PrivateRoute from './components/Auth/PrivateRoute';
import InstructorRoute from './components/Auth/InstructorRoute'; // Restore the import for InstructorRoute

const App = () => (
  <Router>
    <Navbar />
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} /> {/* Temporarily make Register accessible */}
      <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
      <Route path="/evaluation" element={<PrivateRoute><EvaluationForm /></PrivateRoute>} />
      <Route path="/gradebook" element={<PrivateRoute><Gradebook /></PrivateRoute>} />
      <Route path="/define-areas" element={<InstructorRoute><DefineAreas /></InstructorRoute>} /> {/* Role-based route */}
      <Route path="/manage-students" element={<InstructorRoute><ManageStudents /></InstructorRoute>} /> {/* Role-based route */}
    </Routes>
  </Router>
);

export default App;
