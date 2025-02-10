/**
 * student-evaluation-app\client\src\components\Instructor\ManageUsers.jsx
 * ManageUsers.jsx
 *
 * This component allows an instructor to manage users:
 *  - Add a new user (with username, password, role, etc.)
 *  - Edit an existing user (including changing password)
 *  - Delete a user (including removing all their quiz submissions, evaluations, and grades in the backend)
 *
 * Requires 'instructor' or 'admin' role based on server route authorization.
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import URL from '../../backEndURL'; // Make sure this points to your backend's base URL

const ManageUsers = () => {
  // Users currently stored in the database
  const [users, setUsers] = useState([]);

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // This is for success or error feedback when performing actions (add, edit, delete)
  const [message, setMessage] = useState('');

  // Store the user currently being edited (if any)
  // If null, we are in "Add New User" mode
  const [editUser, setEditUser] = useState(null);

  // Form data state for both add and edit
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'student',
    teamName: '',
    firstName: '',
    lastName: '',
    subject: '',
  });

  /**
   * Fetch all users from the backend on component mount.
   */
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Grab the JWT token from local storage
        const token = localStorage.getItem('token');
        const config = {
          headers: { Authorization: `Bearer ${token}` },
        };
        // Get all users from server
        const response = await axios.get(`${URL}/api/users`, config);
        setUsers(response.data);
      } catch (err) {
        setError('Error fetching users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  /**
   * Handle changes in the form fields for both add/edit modes.
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /**
   * Submit the form to add a new user.
   */
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      setMessage(''); // Clear any old message
      // Grab the JWT token
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      // POST to /api/users/add
      const response = await axios.post(`${URL}/api/users/add`, formData, config);
      // Update local state with the newly added user
      setUsers((prev) => [...prev, response.data]);
      setMessage(`User '${response.data.username}' added successfully!`);

      // Reset the form
      setFormData({
        username: '',
        password: '',
        role: 'student',
        teamName: '',
        firstName: '',
        lastName: '',
        subject: '',
      });
    } catch (err) {
      setMessage('Error adding user: ' + err.response?.data?.message || err.message);
    }
  };

  /**
   * Prepare form data for editing the selected user.
   */
  const handleEdit = (user) => {
    setEditUser(user);
    setMessage(''); // Clear any old message
    // Initialize form with the existing user's data (password left blank by default)
    setFormData({
      username: user.username,
      password: '', // We only fill this if we want to change the password
      role: user.role,
      teamName: user.teamName || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      subject: user.subject || '',
    });
  };

  /**
   * Submit the form to edit an existing user (including password if provided).
   */
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setMessage('');
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      // PUT to /api/users/:userId
      const response = await axios.put(`${URL}/api/users/${editUser._id}`, formData, config);

      // Update the local list of users with the edited user
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u._id === editUser._id ? response.data : u))
      );
      setMessage(`User '${response.data.username}' updated successfully!`);

      // Clear edit mode
      setEditUser(null);
      // Reset form
      setFormData({
        username: '',
        password: '',
        role: 'student',
        teamName: '',
        firstName: '',
        lastName: '',
        subject: '',
      });
    } catch (err) {
      setMessage('Error updating user: ' + err.response?.data?.message || err.message);
    }
  };

  /**
   * Cancel the edit mode and reset the form.
   */
  const handleCancelEdit = () => {
    setEditUser(null);
    setMessage('');
    setFormData({
      username: '',
      password: '',
      role: 'student',
      teamName: '',
      firstName: '',
      lastName: '',
      subject: '',
    });
  };

  /**
   * Delete a user by ID, including all quiz submissions and evaluations on the server side.
   */
  const handleDelete = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.delete(`${URL}/api/users/${userId}`, config);
      setUsers(users.filter((user) => user._id !== userId));
      setMessage('User deleted successfully.');
    } catch (err) {
      setMessage('Error deleting user: ' + err.response?.data?.message || err.message);
    }
  };

  // If still loading data
  if (loading) {
    return <div>Loading...</div>;
  }

  // If there was an error fetching initial data
  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div className="manage-users-container" style={{ padding: '20px' }}>
      <h2>Manage Users</h2>
      {message && <p style={{ color: 'blue' }}>{message}</p>}

      {/* Display the current list of users in a table */}
      <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: '20px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Username</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>First Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Last Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Role</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Team Name</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Subject</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user._id}>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.username}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.firstName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.lastName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.role}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.teamName}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.subject}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                <button onClick={() => handleEdit(user)} style={{ marginRight: '10px' }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(user._id)} style={{ color: 'red' }}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Form for Adding or Editing user */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '5px' }}>
        {editUser ? <h3>Edit User</h3> : <h3>Add New User</h3>}
        <form onSubmit={editUser ? handleEditSubmit : handleAddUser}>
          <div style={{ marginBottom: '10px' }}>
            <label>Username:</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              style={{ marginLeft: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Password:
              <input
                type="password"
                name="password"
                placeholder={
                  editUser
                    ? 'Enter new password to change'
                    : 'Enter password for new user'
                }
                value={formData.password}
                onChange={handleChange}
                required={!editUser} 
                // If editing, the user might not want to update password, but 
                // in that case they'd have to put something or we handle it as optional.
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Role:</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ marginLeft: '10px' }}
            >
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              {/* If your app has an admin role, you can add it here */}
              {/* <option value="admin">Admin</option> */}
            </select>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Team Name:</label>
            <input
              type="text"
              name="teamName"
              value={formData.teamName}
              onChange={handleChange}
              style={{ marginLeft: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>First Name:</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              style={{ marginLeft: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Last Name:</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              style={{ marginLeft: '10px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Subject:</label>
            <input
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              style={{ marginLeft: '10px' }}
            />
          </div>
          <button type="submit" style={{ marginRight: '10px' }}>
            {editUser ? 'Update User' : 'Add User'}
          </button>
          {editUser && (
            <button type="button" onClick={handleCancelEdit}>
              Cancel
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ManageUsers;
