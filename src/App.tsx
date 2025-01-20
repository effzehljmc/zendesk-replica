import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminSettings } from './pages/admin/Settings';
import TicketsPage from '@/pages/tickets';
import CreateTicketPage from '@/pages/tickets/create';
import TicketDetailPage from '@/pages/tickets/[id]';

// Enable future flags for React Router
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

function App() {
  return (
    <Router {...router}>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Admin Only Routes */}
            <Route path="/admin" element={<RoleProtectedRoute roles={['admin']}><AdminLayout /></RoleProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<div>Users Management (Admin Only)</div>} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="knowledge-base" element={<div>Knowledge Base Management</div>} />
            </Route>

            {/* Ticket Routes */}
            <Route
              path="/tickets"
              element={<RoleProtectedRoute roles={['admin', 'agent']}><TicketsPage /></RoleProtectedRoute>}
            />
            <Route
              path="/tickets/create"
              element={<RoleProtectedRoute roles={['admin', 'agent']}><CreateTicketPage /></RoleProtectedRoute>}
            />
            <Route
              path="/tickets/:id"
              element={<RoleProtectedRoute roles={['admin', 'agent']}><TicketDetailPage /></RoleProtectedRoute>}
            />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
