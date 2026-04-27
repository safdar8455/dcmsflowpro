/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { Shell } from './components/Shell';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { ClaimList } from './components/ClaimList';
import { ClaimForm } from './components/ClaimForm';
import { UserAccess } from './components/UserAccess';

const AuthenticatedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Shell>{children}</Shell>;
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <AuthenticatedRoute>
                <Dashboard />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/claims"
            element={
              <AuthenticatedRoute>
                <ClaimList />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/claims/:id"
            element={
              <AuthenticatedRoute>
                <ClaimForm />
              </AuthenticatedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AuthenticatedRoute>
                <UserAccess />
              </AuthenticatedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
