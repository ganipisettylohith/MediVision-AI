import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Moon, Bell, Trash2, AlertTriangle, CheckCircle2, User, Save, ShieldAlert, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api';
import { UserSettingsSchema } from '../types';

export const SettingsPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(user?.settings?.theme || 'dark');
  const [notificationsEnabled, setNotificationsEnabled] = useState(user?.settings?.notifications_enabled ?? true);
  const [defaultPageSize, setDefaultPageSize] = useState(user?.settings?.default_page_size || 10);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Account Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.settings) {
      setTheme(user.settings.theme || 'dark');
      setNotificationsEnabled(user.settings.notifications_enabled ?? true);
      setDefaultPageSize(user.settings.default_page_size || 10);
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(null);
    setSaveError(null);
    setSaving(true);

    try {
      await apiClient.put<UserSettingsSchema>('/settings', {
        theme,
        notifications_enabled: notificationsEnabled,
        default_page_size: defaultPageSize,
      });

      await refreshUser();
      setSaveSuccess('Preferences saved successfully to your user profile.');
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAccountDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);

    if (!deleteConfirmInput.trim()) {
      setDeleteError('Please enter your current password or type "DELETE" to confirm.');
      return;
    }

    setDeletingAccount(true);

    try {
      await apiClient.post('/auth/me/delete', {
        password_or_confirm: deleteConfirmInput.trim(),
      });

      logout();
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Application & Account Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your viewing preferences, pagination defaults, and account management options.</p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs flex items-center space-x-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-center space-x-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Preference Section 1: Dashboard & Display */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Moon className="h-5 w-5 text-cyan-400" />
            <h2 className="font-bold text-lg text-white">Interface & Display Preferences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Theme Mode</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              >
                <option value="dark">Dark Mode (Recommended)</option>
                <option value="slate">Slate Dark</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Default History Page Size</label>
              <select
                value={defaultPageSize}
                onChange={(e) => setDefaultPageSize(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              >
                <option value={5}>5 records per page</option>
                <option value={10}>10 records per page</option>
                <option value={20}>20 records per page</option>
                <option value={50}>50 records per page</option>
              </select>
            </div>
          </div>
        </div>

        {/* Preference Section 2: Notifications */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <Bell className="h-5 w-5 text-cyan-400" />
            <h2 className="font-bold text-lg text-white">System Notifications</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-900/60 rounded-2xl border border-slate-800">
            <div className="space-y-1">
              <span className="block text-sm font-semibold text-slate-200">Diagnostic Notifications</span>
              <span className="block text-xs text-slate-400">Receive in-app alerts when scan reports finish processing.</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => setNotificationsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
            </label>
          </div>

          <div className="p-3.5 bg-slate-900/40 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-center space-x-2">
            <Info className="h-4 w-4 text-cyan-400 shrink-0" />
            <span>Preferences are stored per-user in your database profile and persist across logins.</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Save Preferences</span>
        </button>
      </form>

      {/* Account Danger Zone */}
      <div className="glass-panel p-6 rounded-3xl border border-red-500/20 bg-red-500/5 space-y-5">
        <div className="flex items-center space-x-2.5 border-b border-red-500/20 pb-3 text-red-400">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="font-bold text-lg text-white">Account Management</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="block text-sm font-bold text-white">User Profile Settings</span>
            <span className="block text-xs text-slate-400">View member details or change your account password.</span>
          </div>
          <Link
            to="/profile"
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shrink-0"
          >
            <User className="h-4 w-4 text-cyan-400" />
            <span>Go to Profile</span>
          </Link>
        </div>

        <div className="pt-4 border-t border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="block text-sm font-bold text-red-400">Delete Account & Permanent Purge</span>
            <span className="block text-xs text-slate-400">Permanently delete your user account and purge all associated scan history.</span>
          </div>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteError(null); setDeleteConfirmInput(''); }}
            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shrink-0 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete My Account</span>
          </button>
        </div>
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="h-7 w-7 shrink-0" />
              <h3 className="text-xl font-bold text-white">Permanently Delete Account?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              WARNING: This action is permanent and cannot be undone. Your user account <strong className="text-white">{user?.email}</strong> and all associated medical scan telemetry will be erased permanently.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                {deleteError}
              </div>
            )}

            <form onSubmit={handleConfirmAccountDeletion} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Type your current password or <code className="text-red-400 font-bold">DELETE</code> to confirm:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Password or DELETE"
                  value={deleteConfirmInput}
                  onChange={(e) => setDeleteConfirmInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-red-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deletingAccount}
                  className="px-5 py-2.5 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs"
                >
                  Confirm Permanent Deletion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
