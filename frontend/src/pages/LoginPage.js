import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, getApiErrorMessage } from '../services/api';
import { useAuth } from '../App';

function LoginPage() {
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username.trim(), password);

      if (res.data?.user?.role !== role) {
        setError(`This account is ${res.data?.user?.role || 'not authorized'}. Please choose the correct role.`);
        return;
      }

      handleLogin(res.data.user, res.data.student, res.data.teacher);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">📋</div>
        <h1 className="auth-title">Smart Attendance</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="tabs" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`tab ${role === 'student' ? 'active' : ''}`}
            onClick={() => setRole('student')}
          >
            🎓 Student
          </button>
          <button
            type="button"
            className={`tab ${role === 'teacher' ? 'active' : ''}`}
            onClick={() => setRole('teacher')}
          >
            👨‍🏫 Teacher
          </button>
          <button
            type="button"
            className={`tab ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            ⚙️ Admin
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder={
                role === 'student'
                  ? 'Enter student username'
                  : role === 'teacher'
                    ? 'Enter teacher username'
                    : 'Enter admin username'
              }
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="text-sm text-muted mb-16">
            Logging in as <strong>{role}</strong>
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          New student? <Link to="/register">Register here</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
