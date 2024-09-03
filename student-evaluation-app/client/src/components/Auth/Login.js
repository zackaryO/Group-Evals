// student-evaluation-app\client\src\components\Auth\Login.js
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';  // Import the CSS file
import URL from '../../backEndURL';


const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${URL}/api/auth/login`, { username, password });
      // const res = await axios.post('http://localhost:5000/api/auth/login', { username, password });
      console.log('Login response:', res.data); // Logging the response data

      if (res.data && res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.user._id);
        localStorage.setItem('role', res.data.user.role);
        setUser({
          _id: res.data.user._id,
          username: res.data.user.username,
          role: res.data.user.role
        });
        setError('');
        navigate('/');  // Redirect to evaluation page after login
      } else {
        throw new Error('Invalid response data');
      }
    } catch (error) {
      console.error('Login error:', error); // Logging the error
      setError('Invalid username or password');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <p>Note: this site is using a free server, if server has been in active it could take 60+ seconds to login.</p>
      <form onSubmit={handleSubmit}>
        <label>Username:</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <label>Password:</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p>{error}</p>}
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
