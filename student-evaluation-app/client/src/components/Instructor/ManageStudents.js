// student-evaluation-app\client\src\components\Instructor\ManageStudents.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ManageStudents = () => {
  const [students, setStudents] = useState([]);
  const [newStudent, setNewStudent] = useState({ username: '', password: '', role: 'student', teamName: '', firstName: '', lastName: '', subject: '' });

  useEffect(() => {
    // Fetch students
    axios.get('/api/users').then(response => setStudents(response.data));
  }, []);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/add', newStudent);
      setStudents([...students, newStudent]);
      // Handle success
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveStudent = async (id) => {
    try {
      await axios.delete(`/api/users/remove/${id}`);
      setStudents(students.filter(student => student._id !== id));
      // Handle success
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Manage Students</h2>
      <form onSubmit={handleAddStudent}>
        <label>Username:</label>
        <input type="text" value={newStudent.username} onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })} required />
        <label>Password:</label>
        <input type="password" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} required />
        <label>Team Name:</label>
        <input type="text" value={newStudent.teamName} onChange={(e) => setNewStudent({ ...newStudent, teamName: e.target.value })} />
        <label>First Name:</label>
        <input type="text" value={newStudent.firstName} onChange={(e) => setNewStudent({ ...newStudent, firstName: e.target.value })} required />
        <label>Last Name:</label>
        <input type="text" value={newStudent.lastName} onChange={(e) => setNewStudent({ ...newStudent, lastName: e.target.value })} required />
        <label>Subject:</label>
        <input type="text" value={newStudent.subject} onChange={(e) => setNewStudent({ ...newStudent, subject: e.target.value })} />
        <button type="submit">Add Student</button>
      </form>
      <ul>
        {students.map(student => (
          <li key={student._id}>
            {student.firstName} {student.lastName} ({student.username}) - {student.subject}
            <button onClick={() => handleRemoveStudent(student._id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ManageStudents;
