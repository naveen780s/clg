import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/common/Loader';
import Layout from '../components/common/Layout';

// Lazy load components
const LandingPage = React.lazy(() => import('../pages/LandingPage'));
const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const RegisterPage = React.lazy(() => import('../pages/RegisterPage'));
const StudentDashboard = React.lazy(() => import('../pages/dashboard/StudentDashboard'));
const MentorDashboard = React.lazy(() => import('../pages/dashboard/MentorDashboard'));
const HODDashboard = React.lazy(() => import('../pages/dashboard/HODDashboard'));
const SecurityDashboard = React.lazy(() => import('../pages/dashboard/SecurityDashboard'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
const CreatePass = React.lazy(() => import('../pages/passes/CreatePass'));
const PassList = React.lazy(() => import('../pages/passes/PassList'));
const PassDetail = React.lazy(() => import('../pages/passes/PassDetail'));
const ApprovalQueue = React.lazy(() => import('../pages/ApprovalQueue'));
const Statistics = React.lazy(() => import('../pages/Statistics'));
const QRScanner = React.lazy(() => import('../pages/QRScanner'));
const NotificationsPage = React.lazy(() => import('../pages/NotificationsPage'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loader />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Dashboard Route Component
const DashboardRoute = () => {
  const { user } = useAuth();

  switch (user?.role) {
    case 'student':
      return <StudentDashboard />;
    case 'mentor':
      return <MentorDashboard />;
    case 'hod':
      return <HODDashboard />;
    case 'security':
      return <SecurityDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  return (
    <Layout>
      <Suspense fallback={<Loader />}>
        <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRoute />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* Pass Management Routes */}
        <Route
          path="/passes"
          element={
            <ProtectedRoute>
              <PassList />
            </ProtectedRoute>
          }
        />

        <Route
          path="/passes/create"
          element={
            <ProtectedRoute requiredRole="student">
              <CreatePass />
            </ProtectedRoute>
          }
        />

        <Route
          path="/passes/:id"
          element={
            <ProtectedRoute>
              <PassDetail />
            </ProtectedRoute>
          }
        />

        {/* Approval Routes (Mentors and HODs) */}
        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <ApprovalQueue />
            </ProtectedRoute>
          }
        />

        {/* Security Routes */}
        <Route
          path="/scanner"
          element={
            <ProtectedRoute requiredRole="security">
              <QRScanner />
            </ProtectedRoute>
          }
        />

        {/* Statistics (HOD and above) */}
        <Route
          path="/statistics"
          element={
            <ProtectedRoute>
              <Statistics />
            </ProtectedRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Layout>
  );
};

export default AppRoutes;