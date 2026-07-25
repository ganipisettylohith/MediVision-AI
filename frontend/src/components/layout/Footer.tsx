import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="glass-panel border-t border-slate-800 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono">
        <div>
          MediVision AI &copy; {new Date().getFullYear()} - Medical Image Analytics Platform
        </div>
        <div className="flex space-x-4 mt-2 sm:mt-0">
          <span>Automated Reports</span>
          <span>•</span>
          <span>Visual Heatmaps</span>
          <span>•</span>
          <span>Clinical Insights</span>
        </div>
      </div>
    </footer>
  );
};
