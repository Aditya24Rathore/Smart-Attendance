import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, getApiErrorMessage } from '../services/api';
import { useAuth } from '../App';

function RegisterPage() {
  const [form, setForm] = useState({
    password: '', confirm_password: '', full_name: '',
    roll_number: '', department: '', course: '', semester: '',
    year: '', phone: '', email: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { handleLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        full_name: form.full_name.trim(),
        roll_number: form.roll_number.trim(),
        department: form.department.trim(),
        course: form.course.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      };

      const res = await register(payload);
      handleLogin(res.data.user, res.data.student, null);
      navigate('/');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  const departments = [
    'Computer Science', 'Information Technology', 'Electronics',
    'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Biotechnology',
  ];

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">🎓</div>
        <h1 className="auth-title">Student Registration</h1>
        <p className="auth-subtitle">Create your attendance account</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input type="text" name="full_name" className="form-input"
              placeholder="Enter your full name" value={form.full_name}
              onChange={handleChange} required />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Roll Number *</label>
              <input type="text" name="roll_number" className="form-input"
                placeholder="e.g. CS2024001" value={form.roll_number}
                onChange={handleChange} required />
              <div className="text-sm text-muted mt-8">Enter the same roll number used by your college records.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input type="tel" name="phone" className="form-input"
                placeholder="Phone number" value={form.phone}
                onChange={handleChange} required />
              <div className="text-sm text-muted mt-8">Enter a valid mobile number with country code if needed.</div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" name="email" className="form-input"
              placeholder="Optional email" value={form.email}
              onChange={handleChange} />
            <div className="text-sm text-muted mt-8">Optional, but recommended for account recovery updates.</div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Department *</label>
              <select name="department" className="form-select"
                value={form.department} onChange={handleChange} required>
                <option value="">Select</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Course *</label>
              <input type="text" name="course" className="form-input"
                placeholder="e.g. B.Tech" value={form.course}
                onChange={handleChange} required />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Semester *</label>
              <select name="semester" className="form-select"
                value={form.semester} onChange={handleChange} required>
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year *</label>
              <select name="year" className="form-select"
                value={form.year} onChange={handleChange} required>
                <option value="">Select</option>
                {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>

          <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

          <div className="text-sm text-muted mb-16">Your Roll Number will be used as your User ID for login.</div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input type="password" name="password" className="form-input"
                placeholder="Min 6 characters" value={form.password}
                onChange={handleChange} required minLength={6}
                autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input type="password" name="confirm_password" className="form-input"
                placeholder="Re-enter password" value={form.confirm_password}
                onChange={handleChange} required minLength={6}
                autoComplete="new-password" />
              <div className="text-sm text-muted mt-8">Must match the password exactly.</div>
            </div>
          </div>
          <div className="text-sm text-muted mb-16">Use a password with at least 6 characters.</div>

          <button type="submit" className="btn btn-primary btn-block btn-lg mt-8" disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already registered? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
