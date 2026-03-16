import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/ui/Toast';
import { canAccessAdminApp, isAdmin, isModerator } from './utils/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import SensorsPage from './pages/SensorsPage';
import SettingsPage from './pages/SettingsPage';
import ModerationPage from './pages/ModerationPage';
import ReportManagementPage from './pages/ReportManagementPage';
import ReliabilityRankingPage from './pages/ReliabilityRankingPage';
import ReportStatsPage from './pages/ReportStatsPage';
import AuditLogPage from './pages/AuditLogPage';
import Layout from './components/layout/Layout';

const AdminRoute = ({ children }) => {
  if (!canAccessAdminApp()) return <Navigate to="/login" replace />;
  return children;
};

/** Chỉ Admin: user, audit, sensor, OTA, ... Admin không kế thừa quyền Moderator. */
const AdminOnlyRoute = ({ children }) => {
  if (!canAccessAdminApp()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/" replace />;
  return children;
};

/** Chỉ Moderator: kiểm duyệt báo cáo, thống kê nghiệp vụ, xếp hạng tin cậy. */
const ModeratorOnlyRoute = ({ children }) => {
  if (!canAccessAdminApp()) return <Navigate to="/login" replace />;
  if (!isModerator()) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <ToastProvider>
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
            <AdminOnlyRoute>
              <Layout>
                <UserManagementPage />
              </Layout>
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/quan-ly-bao-cao"
          element={
            <AdminOnlyRoute>
              <Layout>
                <ReportManagementPage />
              </Layout>
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/moderation"
          element={
            <ModeratorOnlyRoute>
              <Layout>
                <ModerationPage />
              </Layout>
            </ModeratorOnlyRoute>
          }
        />
        <Route
          path="/reliability-ranking"
          element={
            <ModeratorOnlyRoute>
              <Layout>
                <ReliabilityRankingPage />
              </Layout>
            </ModeratorOnlyRoute>
          }
        />
        <Route
          path="/report-stats"
          element={
            <ModeratorOnlyRoute>
              <Layout>
                <ReportStatsPage />
              </Layout>
            </ModeratorOnlyRoute>
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
        <Route
          path="/sensors"
          element={
            <AdminOnlyRoute>
              <Layout>
                <SensorsPage />
              </Layout>
            </AdminOnlyRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <AdminOnlyRoute>
              <Layout>
                <SettingsPage />
              </Layout>
            </AdminOnlyRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ToastProvider>
  );
}

export default App;
