import React, { useState } from 'react';
import { User as UserIcon, Mail, Calendar, Lock, FileScan, Clock, CheckCircle2, AlertCircle, Save, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { UserResponse } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [updatingName, setUpdatingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSuccess(null);
    setNameError(null);

    if (!fullName.trim()) {
      setNameError('Full name cannot be blank.');
      return;
    }

    setUpdatingName(true);

    try {
      await apiClient.put<UserResponse>('/auth/me', { full_name: fullName.trim() });
      await refreshUser();
      setNameSuccess('Profile name updated successfully.');
    } catch (err: any) {
      setNameError(err.message || 'Failed to update profile name.');
    } finally {
      setUpdatingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setUpdatingPassword(true);

    try {
      await apiClient.put('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword,
      });

      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="h-20 w-20 rounded-2xl bg-cyan-500/10 border-2 border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold text-3xl shrink-0 shadow-lg shadow-cyan-500/10">
          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
        </div>

        <div className="space-y-2 text-center sm:text-left flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{user?.full_name}</h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Mail className="h-3.5 w-3.5 text-cyan-400" />
              <span>{user?.email}</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <Calendar className="h-3.5 w-3.5 text-cyan-400" />
              <span>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Telemetry Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <FileScan className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Total Scans Analyzed</span>
            <span className="text-2xl font-extrabold text-white">{user?.total_scans ?? 0}</span>
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
          <div className="h-12 w-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 block font-medium">Last Scan Execution</span>
            <span className="text-sm font-bold text-slate-200">
              {user?.last_scan_date ? new Date(user.last_scan_date).toLocaleString() : 'No scans performed yet'}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Settings Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Card 1: Personal Details */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <UserIcon className="h-5 w-5 text-cyan-400" />
            <h2 className="font-bold text-lg text-white">Personal Information</h2>
          </div>

          {nameSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{nameSuccess}</span>
            </div>
          )}

          {nameError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{nameError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={updatingName}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Name Changes</span>
            </button>
          </form>
        </div>

        {/* Card 2: Security & Password */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <KeyRound className="h-5 w-5 text-cyan-400" />
            <h2 className="font-bold text-lg text-white">Security & Password</h2>
          </div>

          {passwordSuccess && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={updatingPassword}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center space-x-2"
            >
              <Lock className="h-4 w-4 text-cyan-400" />
              <span>Update Password</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
