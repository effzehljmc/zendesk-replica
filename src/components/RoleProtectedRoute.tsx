import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../contexts/AuthContext';

type RoleProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles: Role['name'][];
};

export function RoleProtectedRoute({ children, allowedRoles }: RoleProtectedRouteProps) {
  const { profile } = useAuth();

  const hasRequiredRole = profile?.roles.some(role => allowedRoles.includes(role.name));

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
} 