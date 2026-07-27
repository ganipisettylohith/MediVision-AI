import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileScan, History, Settings, HelpCircle } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analyze Scan', path: '/analysis', icon: FileScan },
    { name: 'Scan History', path: '/history', icon: History },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 p-4 hidden md:flex flex-col justify-between min-h-[calc(100vh-4rem)]">
      <div className="space-y-6">
        <div>
          <h3 className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</h3>
          <nav className="mt-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`
                }
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 space-y-1">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`
          }
        >
          <Settings className="mr-3 h-4 w-4" />
          Settings
        </NavLink>
        <NavLink
          to="/help"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              isActive ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
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
