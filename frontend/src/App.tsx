import { Navigate, Route, Routes } from 'react-router-dom';
import { ApiHealthBanner } from './components/ApiHealthBanner';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminDashboard } from './pages/AdminDashboard';
import { AttendancePage } from './pages/AttendancePage';
import { FaceEnrollment } from './pages/FaceEnrollment';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { ForgotPassword } from './pages/ForgotPassword';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { ProfilePage } from './pages/ProfilePage';
import { Register } from './pages/Register';
import { ReportsPage } from './pages/ReportsPage';
import { ResetPassword } from './pages/ResetPassword';
import { StudentDashboard } from './pages/StudentDashboard';
import { SubjectManagement } from './pages/SubjectManagement';
import { UsersPage } from './pages/UsersPage';
import { UserApprovals } from './pages/UserApprovals';
import { FaceManagement } from './pages/FaceManagement';
import { useAuth } from './state/AuthContext';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  return <Navigate to={`/${user.role}`} replace />;
}

export function App() {
  return (
    <>
      <ApiHealthBanner />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/faculty" element={<FacultyDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/face-enrollment" element={<FaceEnrollment />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/subjects" element={<SubjectManagement />} />
            <Route path="/approvals" element={<UserApprovals />} />
            <Route path="/face-management" element={<FaceManagement />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
