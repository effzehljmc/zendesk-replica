import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { Login } from './pages/Login';
import { SignUp } from './pages/SignUp';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Suspense } from 'react';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Suspense fallback={<div>Loading...</div>}>
                    <Routes>
                      <Route index element={<Dashboard />} />
                      <Route
                        path="users"
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <div>Users Management (Admin Only)</div>
                          </RoleProtectedRoute>
                        }
                      />
                      <Route
                        path="settings"
                        element={
                          <RoleProtectedRoute allowedRoles={['admin']}>
                            <div>Settings (Admin Only)</div>
                          </RoleProtectedRoute>
                        }
                      />
                      <Route
                        path="tickets/*"
                        element={
                          <RoleProtectedRoute allowedRoles={['admin', 'agent']}>
                            <div>Ticket Management (Admin & Agent Only)</div>
                          </RoleProtectedRoute>
                        }
                      />
                    </Routes>
                  </Suspense>
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
