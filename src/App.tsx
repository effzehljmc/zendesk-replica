import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analytics } from './pages/Analytics';
import { AdminLayout } from './components/AdminLayout';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminSettings } from './pages/admin/Settings';
import AdminUsers from './pages/admin/Users';
import UserDetail from './pages/admin/UserDetail';
import UserEdit from './pages/admin/UserEdit';
import { Toaster } from './components/ui/toaster';
import TicketsPage from '@/pages/tickets';
import CreateTicketPage from '@/pages/tickets/create';
import TicketDetailPage from '@/pages/tickets/[id]';
import KnowledgeBase from '@/pages/kb';
import KBArticle from '@/pages/kb/[id]';
import KnowledgeBaseAdmin from '@/pages/admin/KnowledgeBase';

// Enable future flags for React Router
const router = {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
};

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router {...router}>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            
            {/* Public Knowledge Base Routes */}
            <Route path="/kb" element={<Layout />}>
              <Route index element={<KnowledgeBase />} />
              <Route path=":id" element={<KBArticle />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              
              {/* Analytics Route - Only for agents and admins */}
              <Route
                path="/analytics"
                element={<RoleProtectedRoute roles={['admin', 'agent']}><Analytics /></RoleProtectedRoute>}
              />
              
              {/* Admin Only Routes */}
              <Route path="/admin" element={<RoleProtectedRoute roles={['admin']}><AdminLayout /></RoleProtectedRoute>}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="users/:id" element={<UserDetail />} />
                <Route path="users/:id/edit" element={<UserEdit />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="knowledge-base" element={<KnowledgeBaseAdmin />} />
              </Route>

              {/* Ticket Routes */}
              <Route
                path="/tickets"
                element={<RoleProtectedRoute roles={['admin', 'agent', 'customer']}><TicketsPage /></RoleProtectedRoute>}
              />
              <Route
                path="/tickets/create"
                element={<RoleProtectedRoute roles={['admin', 'agent', 'customer']}><CreateTicketPage /></RoleProtectedRoute>}
              />
              <Route
                path="/tickets/:id"
                element={<RoleProtectedRoute roles={['admin', 'agent', 'customer']}><TicketDetailPage /></RoleProtectedRoute>}
              />
            </Route>
          </Routes>
          <Toaster />
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
