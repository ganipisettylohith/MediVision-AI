import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Settings } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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

        {/* Top-Right Action Section */}
        <div className="flex items-center space-x-3">
          <Link
            to="/settings"
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
              isActive('/settings')
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <Settings className="h-4 w-4 text-cyan-400" />
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </header>
  );
};
