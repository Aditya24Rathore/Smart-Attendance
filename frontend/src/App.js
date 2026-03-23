import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getCurrentUser } from './services/api';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Auth Context
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [teacherData, setTeacherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    const bootstrapTimeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    checkAuth().finally(() => {
      clearTimeout(bootstrapTimeout);
    });

    return () => clearTimeout(bootstrapTimeout);
  }, []);

  const checkAuth = async () => {
    try {
      const res = await getCurrentUser();
      setUser(res.data.user);
      setStudentData(res.data.student || null);
      setTeacherData(res.data.teacher || null);
    } catch {
      setUser(null);
      setStudentData(null);
      setTeacherData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData, student, teacher) => {
    setUser(userData);
    setStudentData(student || null);
    setTeacherData(teacher || null);
  };

  const handleLogout = () => {
    setUser(null);
    setStudentData(null);
    setTeacherData(null);
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, studentData, teacherData, handleLogin, handleLogout, checkAuth }}>
      <Router>
        <Suspense
          fallback={
            <div className="loading" style={{ minHeight: '100vh' }}>
              <div className="spinner" />
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
            <Route
              path="/*"
              element={
                !user ? (
                  <Navigate to="/login" />
                ) : user.role === 'student' ? (
                  <StudentDashboard />
                ) : user.role === 'teacher' ? (
                  <TeacherDashboard />
                ) : (
                  <AdminDashboard />
                )
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
