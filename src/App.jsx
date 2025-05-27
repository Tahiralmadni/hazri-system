import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import AdminSetup from './pages/AdminSetup';
import AdminDashboard from './pages/admin/Dashboard';
import TeacherDashboard from './pages/teacher/Dashboard';
import TeacherManagement from './pages/admin/TeacherManagement';
import AttendanceRecords from './pages/admin/AttendanceRecords';
import TeacherProfile from './pages/admin/TeacherProfile';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherDebug from './pages/teacher/TeacherDebug';

// Protected route wrapper
const ProtectedRoute = ({ children, requiredRoles }) => {
  const { currentUser, userRole } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRoles && !requiredRoles.includes(userRole)) {
    // Redirect to user's dashboard if they don't have the required role
    return <Navigate to={userRole === 'admin' ? '/admin' : '/teacher'} replace />;
  }

  return children;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/admin-setup" element={<AdminSetup />} />

          {/* Protected Teacher Routes */}
          <Route path="/teacher" element={
            <ProtectedRoute requiredRoles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />
          <Route path="/teacher/attendance" element={
            <ProtectedRoute requiredRoles={['teacher']}>
              <TeacherAttendance />
            </ProtectedRoute>
          } />
          <Route path="/teacher/debug" element={
            <ProtectedRoute requiredRoles={['teacher']}>
              <TeacherDebug />
            </ProtectedRoute>
          } />

          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/teachers" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <TeacherManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/teacher/:id" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <TeacherProfile />
            </ProtectedRoute>
          } />
          <Route path="/admin/attendance" element={
            <ProtectedRoute requiredRoles={['admin']}>
              <AttendanceRecords />
            </ProtectedRoute>
          } />

          {/* Redirect to login if not authenticated */}
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
