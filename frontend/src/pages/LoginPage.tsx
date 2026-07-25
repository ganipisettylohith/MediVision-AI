import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Activity, LogIn, AlertCircle, Info, Lock, Mail, Loader2 } from 'lucide-react';
import apiClient from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Token } from '../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Your previous session has expired. Please log in again.');
    }
    if (location.state?.registered) {
      setNotice('Registration successful! Please log in with your credentials.');
    }
  }, [searchParams, location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await apiClient.post<Token>('/auth/login', {
        email: email.trim(),
        password,
      });

      login(res.data.access_token, res.data.user);

      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid email address or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setNotice('Password reset is disabled in evaluation mode. Please contact your system administrator to update credentials.');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl bg-slate-950/90">
        <div className="text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Sign In to MediVision AI</h2>
          <p className="text-xs text-slate-400">Access your medical scan diagnostics and patient analytics</p>
        </div>

        {notice && (
          <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-300 text-xs flex items-start space-x-2.5">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{notice}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-start space-x-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                placeholder="doctor@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Password</label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-cyan-400 hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-3.5 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-800">
          <p className="text-xs text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 hover:underline font-bold">
              Register Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
