import React from 'react';
import { logout } from '../services/api';
import { useAuth } from '../App';

function Navbar() {
  const { user, handleLogout } = useAuth();

  const onLogout = async () => {
    try {
      await logout();
    } catch {}
    handleLogout();
  };

  if (!user) return null;

  const roleLabels = {
    student: '🎓 Student',
    teacher: '👨‍🏫 Teacher',
    admin: '⚙️ Admin',
    hod: '🏛️ HOD',
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="icon">📋</span>
        Smart Attendance
      </div>
      <div className="navbar-user">
        <span className="navbar-role">{roleLabels[user.role] || user.role}</span>
        <span style={{ fontSize: '0.9rem' }}>{user.full_name}</span>
        <button className="btn btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
