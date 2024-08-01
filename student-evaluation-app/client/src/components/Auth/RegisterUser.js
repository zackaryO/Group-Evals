import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './RegisterUser.css';  // Import the CSS file

const RegisterUser = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'student',
    teamName: '',
    firstName: '',
    lastName: '',
    subject: ''
  });
  const [message, setMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('https://group-evals.onrender.com/api/users');
      //const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('https://group-evals.onrender.com/api/users/add', formData);
      //const response = await axios.post('http://localhost:5000/api/users/add', formData);
      setMessage(`User ${response.data.username} added successfully!`);
      fetchUsers(); // Refresh the user list
    } catch (error) {
      setMessage('Error adding user: ' + error.message);
    }
  };

const handleDelete = async (userId) => {
  try {
    await axios.delete(`https://group-evals.onrender.com/api/users/${userId}`);
    //await axios.delete(`http://localhost:5000/api/users/${userId}`);
    fetchUsers(); // Refresh the user list
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

  const handleEdit = (user) => {
    setEditUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role,
      teamName: user.teamName,
      firstName: user.firstName,
      lastName: user.lastName,
      subject: user.subject
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`https://group-evals.onrender.com/api/users/${editUser._id}`, formData);
      //const response = await axios.put(`http://localhost:5000/api/users/${editUser._id}`, formData);      
      setMessage(`User ${response.data.username} updated successfully!`);
      setEditUser(null);
      fetchUsers(); // Refresh the user list
    } catch (error) {
      setMessage('Error updating user: ' + error.message);
    }
  };

  const handleAddNewUser = () => {
    setEditUser(null);
    setFormData({
      username: '',
      password: '',
      role: 'student',
      teamName: '',
      firstName: '',
      lastName: '',
      subject: ''
    });
    setMessage('');
  };

  return (
    <div className="register-user-container">
      <div className="users-list-card">
        <h3>Current Users</h3>
        {users.length > 0 ? (
          <table className="users-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Team Name</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Subject</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id}>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{user.teamName}</td>
                  <td>{user.firstName}</td>
                  <td>{user.lastName}</td>
                  <td>{user.subject}</td>
                  <td className="actions">
                    <button onClick={() => handleEdit(user)}>Edit</button>
                    <button className="delete" onClick={() => handleDelete(user._id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No users found</p>
        )}
      </div>

      <div className="register-user-card">
        <h2>{editUser ? 'Edit User' : 'Register New User'}</h2>
        {message && <p className="message">{message}</p>}
        <form onSubmit={editUser ? handleEditSubmit : handleSubmit}>
          <div className="field-container">
            <label>
              Username:
              <input type="text" name="username" value={formData.username} onChange={handleChange} required />
            </label>
          </div>
          <div className="field-container">
            <label>
              Password:
              <input type="password" name="password" value={formData.password} onChange={handleChange} required />
            </label>
          </div>
          <div className="field-container">
            <label>
              Role:
              <select name="role" value={formData.role} onChange={handleChange} required>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
              </select>
            </label>
          </div>
          <div className="field-container">
            <label>
              Team Name:
              <input type="text" name="teamName" value={formData.teamName} onChange={handleChange} />
            </label>
          </div>
          <div className="field-container">
            <label>
              First Name:
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} />
            </label>
          </div>
          <div className="field-container">
            <label>
              Last Name:
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} />
            </label>
          </div>
          <div className="field-container">
            <label>
              Subject:
              <input type="text" name="subject" value={formData.subject} onChange={handleChange} />
            </label>
          </div>
          <button type="submit">{editUser ? 'Update User' : 'Add User'}</button>
          {editUser && <button type="button" onClick={handleAddNewUser}>Add New User</button>}
        </form>
      </div>
    </div>
  );
};

export default RegisterUser;
