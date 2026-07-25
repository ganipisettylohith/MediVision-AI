import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
      <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-bold text-white">404 - Page Not Found</h1>
      <p className="text-slate-400 max-w-md">The requested endpoint or view does not exist on MediVision AI.</p>
      <Link
        to="/"
        className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg text-sm transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>Return to Home</span>
      </Link>
    </div>
  );
};
