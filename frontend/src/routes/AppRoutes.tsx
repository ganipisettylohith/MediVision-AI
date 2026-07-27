import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/HomePage';
import { DashboardPage } from '../pages/DashboardPage';
import { AnalysisPage } from '../pages/AnalysisPage';
import { SettingsPage } from '../pages/SettingsPage';
import { HelpPage } from '../pages/HelpPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      <Route path="/help" element={<HelpPage />} />

      {/* Main Application Routes */}
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/analysis" element={<AnalysisPage />} />
      <Route path="/history" element={<DashboardPage />} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      <Route path="/settings" element={<SettingsPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
