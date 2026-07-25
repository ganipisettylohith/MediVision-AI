import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, LogIn, UserPlus, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800 bg-slate-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-slate-100 tracking-tight">MediVision <span className="text-cyan-400">AI</span></span>
            <span className="block text-[10px] text-slate-400 font-mono">Medical Image Analytics</span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-1 sm:space-x-4">
          <Link
            to="/"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/') ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Home
          </Link>
          <Link
            to="/dashboard"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/dashboard') ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/analysis"
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive('/analysis') ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            New Scan
          </Link>
        </nav>

        {/* User Auth Section */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-all"
              >
                <div className="h-7 w-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline max-w-[120px] truncate">{user.full_name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div
                  onMouseLeave={() => setDropdownOpen(false)}
                  className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs text-slate-200 space-y-1"
                >
                  <div className="px-4 py-2 border-b border-slate-800">
                    <span className="block font-bold text-white truncate">{user.full_name}</span>
                    <span className="block text-[11px] text-slate-400 truncate">{user.email}</span>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <User className="mr-2.5 h-4 w-4 text-cyan-400" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  >
                    <Settings className="mr-2.5 h-4 w-4 text-cyan-400" />
                    <span>Settings</span>
                  </Link>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 hover:bg-red-500/10 text-red-400 transition-colors text-left"
                    >
                      <LogOut className="mr-2.5 h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all flex items-center space-x-1.5"
              >
                <LogIn className="h-3.5 w-3.5 text-cyan-400" />
                <span>Log In</span>
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-950 bg-cyan-500 hover:bg-cyan-400 transition-all shadow-md shadow-cyan-500/20 flex items-center space-x-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
