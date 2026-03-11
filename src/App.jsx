import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { canAccessAdminApp, isAdmin } from './utils/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import ModerationPage from './pages/ModerationPage';
import ReliabilityRankingPage from './pages/ReliabilityRankingPage';
import ReportStatsPage from './pages/ReportStatsPage';
import AuditLogPage from './pages/AuditLogPage';
import Layout from './components/layout/Layout';

const AdminRoute = ({ children }) => {
  if (!canAccessAdminApp()) return <Navigate to="/login" replace />;
  return children;
};

const AdminOnlyRoute = ({ children }) => {
  if (!canAccessAdminApp()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <AdminRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/users"
          element={
            <AdminRoute>
              <Layout>
                <UserManagementPage />
              </Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/moderation"
          element={
            <AdminRoute>
              <Layout>
                <ModerationPage />
              </Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/reliability-ranking"
          element={
            <AdminRoute>
              <Layout>
                <ReliabilityRankingPage />
              </Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/report-stats"
          element={
            <AdminRoute>
              <Layout>
                <ReportStatsPage />
              </Layout>
            </AdminRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <AdminOnlyRoute>
              <Layout>
                <AuditLogPage />
              </Layout>
            </AdminOnlyRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
