import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileScan, History, Settings, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export const Sidebar: React.FC = () => {
  const location = useLocation();
  
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analyze Scan', path: '/analysis', icon: FileScan },
    { name: 'Scan History', path: '/dashboard', icon: History }, // Alias to dashboard history table
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 p-4 hidden md:flex flex-col justify-between min-h-[calc(100vh-4rem)] bg-slate-950/40 relative">
      <div className="space-y-6">
        <div>
          <h3 className="px-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Navigation</h3>
          <nav className="mt-3 space-y-1 relative">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all relative ${
                    isActive ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="active-nav-bubble" 
                      className="absolute inset-0 bg-cyan-500/10 border border-cyan-500/20 rounded-xl -z-10 shadow-glow-cyan"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <item.icon className={`mr-3 h-5 w-5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-800/80 pt-4 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`
          }
        >
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </NavLink>
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`
          }
        >
          <HelpCircle className="mr-3 h-4 w-4" />
          Documentation
        </NavLink>
      </div>
    </aside>
  );
};
