import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type RoleProtectedRouteProps = {
  children: React.ReactNode;
  roles: string[];
};

export function RoleProtectedRoute({ children, roles }: RoleProtectedRouteProps) {
  const { profile } = useAuth();

  const hasRequiredRole = profile?.roles.some(role => roles.includes(role.name));

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
} 