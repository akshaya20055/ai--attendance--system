import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export function ProtectedRoute() {
  const { token, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center text-slate-600">Loading secure workspace...</div>;
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
