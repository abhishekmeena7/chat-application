
import { useState } from 'react';
import './Login.css';
import Register from '../Register/Register';

const Login = ({ onLogin }) => {
  const [showRegister, setShowRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError('Failed to connect to server');
    }
    setLoading(false);
  };

  if (showRegister) {
    return <Register onRegister={onLogin} />;
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>💬 Chat App</h1>
          <p>Welcome back!</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </form>
        <div className="toggle-auth">
          <p>
            Don't have an account?
            <button
              type="button"
              onClick={() => {
                setShowRegister(true);
                setError('');
              }}
              disabled={loading}
            >
              Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
