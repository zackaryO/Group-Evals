// student-evaluation-app\client\src\components\Auth\Login.js
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import './Login.css';  // Import the CSS file
import URL from '../../backEndURL';

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  // The auth interceptor appends ?reason=session_expired when it boots a
  // user out for a stale token; we surface that here so they understand
  // why they're back on the login screen.
  const expiryNotice = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return params.get('reason') === 'session_expired'
      ? 'Your session expired. Please log in again to continue.'
      : null;
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${URL}/api/auth/login`, { username, password });

      console.log('Login response:', res.data); // Logging the response data

      if (res.data && res.data.token && res.data.user) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('userId', res.data.user._id);
        localStorage.setItem('role', res.data.user.role);
        localStorage.setItem('username', res.data.user.username.toLowerCase());
        // Store firstName and lastName
        localStorage.setItem('firstName', res.data.user.firstName);
        localStorage.setItem('lastName', res.data.user.lastName);

        setUser({
          _id: res.data.user._id,
          username: res.data.user.username.toLowerCase(),
          role: res.data.user.role,
          // Set firstName and lastName in user state
          firstName: res.data.user.firstName,
          lastName: res.data.user.lastName,
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
      <p>Note: this site is using a free server, if server has been inactive it could take 60+ seconds to login.</p>
      {expiryNotice && (
        <p
          role="alert"
          style={{
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #f59e0b',
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 12,
          }}
        >
          {expiryNotice}
        </p>
      )}
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




