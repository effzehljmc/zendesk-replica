import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  roles: string[];
}

export function RoleProtectedRoute({ children, roles }: RoleProtectedRouteProps) {
  const { profile, loading } = useAuth();

  // Don't make any decisions while still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Only check roles after loading is complete
  const hasRequiredRole = profile?.roles?.some(role => roles.includes(role.name));

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}