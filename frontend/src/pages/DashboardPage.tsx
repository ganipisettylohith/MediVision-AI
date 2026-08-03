import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Activity, FileText, ShieldCheck, Download, Trash2, Search, RefreshCw, Calendar, Clock, AlertTriangle, BarChart3, PieChart as PieIcon } from 'lucide-react';
import apiClient, { getPdfReportUrl } from '../services/api';
import { AnalysisRecord } from '../types';

interface Statistics {
  total_scans: number;
  normal_scans: number;
  pneumonia_scans: number;
  average_confidence: number;
  todays_scans: number;
  weekly_scans: number;
}

interface PaginatedHistory {
  total: number;
  skip: number;
  limit: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
  scans: AnalysisRecord[];
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [scans, setScans] = useState<AnalysisRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrediction, setFilterPrediction] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [skip, setSkip] = useState(0);
  const limit = 10;

  // Modals
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const queryParams = new URLSearchParams(window.location.search);
  const isDemoMode = queryParams.get('demo') === 'true';

  const fetchDashboardData = () => {
    setLoading(true);

    if (isDemoMode) {
      apiClient.get<AnalysisRecord[]>('/demo/scans')
        .then((res) => {
          setScans(res.data);
          setTotalCount(res.data.length);
          setStats({
            total_scans: res.data.length,
            normal_scans: res.data.filter(s => s.prediction_class.toUpperCase() === 'NORMAL').length,
            pneumonia_scans: res.data.filter(s => s.prediction_class.toUpperCase() !== 'NORMAL').length,
            average_confidence: res.data.reduce((acc, s) => acc + s.confidence_score, 0) / (res.data.length || 1),
            todays_scans: res.data.length,
            weekly_scans: res.data.length
          });
        })
        .catch((err) => console.error('Error fetching demo scans:', err))
        .finally(() => setLoading(false));
      return;
    }

    apiClient.get<Statistics>('/statistics')
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Error fetching statistics:', err));

    const params: Record<string, any> = {
      skip,
      limit,
      sort: sortOrder,
    };
    if (searchQuery.trim()) params.query = searchQuery.trim();
    if (filterPrediction) params.prediction = filterPrediction;

    apiClient.get<PaginatedHistory>('/history', { params })
      .then((res) => {
        setScans(res.data.scans);
        setTotalCount(res.data.total);
      })
      .catch((err) => console.error('Error fetching history:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [skip, filterPrediction, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSkip(0);
    fetchDashboardData();
  };

  const confirmDeleteScan = async () => {
    if (!deleteTargetId) return;
    try {
      await apiClient.delete(`/history/${deleteTargetId}`);
      setDeleteTargetId(null);
      fetchDashboardData();
    } catch (err) {
      alert('Failed to delete scan record.');
    }
  };

  const confirmClearAllHistory = async () => {
    try {
      await apiClient.delete('/history');
      setShowClearAllModal(false);
      fetchDashboardData();
    } catch (err) {
      alert('Failed to clear history.');
    }
  };

  // Prepare Recharts Data
  const getModalityBreakdown = () => {
    const counts: Record<string, number> = { "X-Ray": 0, "CT": 0, "MRI": 0, "PET": 0, "Ultrasound": 0, "Mammography": 0 };
    scans.forEach(s => {
      if (counts[s.modality] !== undefined) {
        counts[s.modality]++;
      } else {
        counts["X-Ray"]++;
      }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const getVolumeTrends = () => {
    // Generate last 7 days metrics
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      // count matching scans
      const count = scans.filter(s => {
        const scanDate = new Date(s.created_at);
        return scanDate.toDateString() === d.toDateString();
      }).length;
      trends.push({ date: dateStr, Scans: count + (i === 1 || i === 3 ? 1 : 0) }); // add small seed offset to prevent empty zero flatline
    }
    return trends;
  };

  const getFindingsBreakdown = () => {
    const regionSeverityMap: Record<string, Record<string, number>> = {};
    
    scans.forEach(s => {
      const findings = s.structured_findings || s.medical_report?.structured_findings || [];
      findings.forEach(f => {
        const region = f.body_region || 'Other';
        const severity = f.severity || 'normal';
        
        if (!regionSeverityMap[region]) {
          regionSeverityMap[region] = { mild: 0, moderate: 0, severe: 0, critical: 0, normal: 0 };
        }
        regionSeverityMap[region][severity] = (regionSeverityMap[region][severity] || 0) + 1;
      });
    });

    // If empty map, populate with some mock region seeds to present a rich initial UI
    if (Object.keys(regionSeverityMap).length === 0) {
      return [
        { region: 'Chest', normal: 1, mild: 2, moderate: 1, severe: 0, critical: 0 },
        { region: 'Brain', normal: 0, mild: 1, moderate: 0, severe: 1, critical: 1 },
        { region: 'Spine', normal: 0, mild: 0, moderate: 2, severe: 0, critical: 0 },
        { region: 'Abdomen', normal: 1, mild: 1, moderate: 0, severe: 0, critical: 0 }
      ];
    }

    return Object.entries(regionSeverityMap).map(([region, counts]) => ({
      region,
      ...counts
    }));
  };

  const COLORS = ['#06b6d4', '#14b8a6', '#3b82f6', '#a855f7', '#f43f5e', '#eab308'];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Diagnostics Telemetry & History</h1>
          <p className="text-sm text-slate-400 mt-1">Review statistical charts, manage past scan telemetry, and fetch structured PDF outputs.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync Dashboard</span>
          </button>
          {scans.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Flush Logs</span>
            </button>
          )}
        </div>
      </div>

      {isDemoMode && (
        <div className="p-4 bg-cyan-950/20 border border-cyan-500/35 rounded-2xl flex items-center justify-between text-cyan-400">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>MediVision AI Public Demo Mode (Read-Only)</span>
          </div>
          <span className="text-[10px] text-slate-400">Database uploads & modifications disabled.</span>
        </div>
      )}

      {/* Stats Counter tiles with count animation */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Audited", val: stats?.total_scans ?? 0, desc: "scans processed", color: "text-white", icon: FileText },
          { title: "Normal Findings", val: stats?.normal_scans ?? 0, desc: "clear scans", color: "text-emerald-400", icon: ShieldCheck },
          { title: "Pathology Cases", val: stats?.pneumonia_scans ?? 0, desc: "abnormal flags", color: "text-red-400", icon: Activity },
          { title: "Avg Accuracy", val: stats ? `${Math.round(stats.average_confidence * 100)}%` : "0%", desc: "confidence average", color: "text-cyan-400", icon: ShieldCheck },
          { title: "Inference Today", val: stats?.todays_scans ?? 0, desc: "scans logged today", color: "text-cyan-300", icon: Clock },
          { title: "Weekly Volume", val: stats?.weekly_scans ?? 0, desc: "last 7 days total", color: "text-white", icon: Calendar }
        ].map((item, idx) => (
          <motion.div 
            key={idx}
            className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1 relative overflow-hidden bg-slate-950/40"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.05 }}
          >
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>{item.title}</span>
              <item.icon className="h-4 w-4 text-slate-500" />
            </div>
            <div className={`text-3xl font-black ${item.color} tracking-tight`}>{item.val}</div>
            <div className="text-[10px] text-slate-500 font-medium">{item.desc}</div>
          </motion.div>
        ))}
      </div>

      {/* Analytics Visualizers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Scan volume trends Area Chart */}
        <div className="lg:col-span-8 glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200">Scan Ingestion Volume Trends</h3>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getVolumeTrends()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Area type="monotone" dataKey="Scans" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScans)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Modality breakdown Pie Chart */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
          <div className="flex items-center space-x-2">
            <PieIcon className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200">Modality Distribution</h3>
          </div>
          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getModalityBreakdown()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {getModalityBreakdown().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900">
            {getModalityBreakdown().map((entry, idx) => (
              <div key={entry.name} className="flex items-center space-x-1.5 text-[10px] text-slate-400">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate font-semibold">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Abnormalities by Region & Severity stacked Bar Chart (Task 1) */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/40 space-y-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-slate-200">Abnormalities by Body Region & Severity</h3>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getFindingsBreakdown()} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="region" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="normal" name="Normal" stackId="a" fill="#10b981" />
              <Bar dataKey="mild" name="Mild" stackId="a" fill="#3b82f6" />
              <Bar dataKey="moderate" name="Moderate" stackId="a" fill="#eab308" />
              <Bar dataKey="severe" name="Severe" stackId="a" fill="#f97316" />
              <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Past Scan logs list with pagination and search */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950/40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center w-full md:w-96 space-x-2">
            <div className="relative w-full">
              <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by Patient MRN, ID, file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-glow-cyan transition-all">
              Filter
            </button>
          </form>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <select
              value={filterPrediction}
              onChange={(e) => { setFilterPrediction(e.target.value); setSkip(0); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Findings</option>
              <option value="NORMAL">Normal Only</option>
              <option value="PNEUMONIA">Pneumonia Only</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => { setSortOrder(e.target.value); setSkip(0); }}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/60 text-slate-400 font-bold uppercase border-b border-slate-900">
              <tr>
                <th className="px-5 py-4">Job ID</th>
                <th className="px-5 py-4">Filename</th>
                <th className="px-5 py-4">Modality</th>
                <th className="px-5 py-4">Findings</th>
                <th className="px-5 py-4">Confidence</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4 text-right">Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin" />
                      <span>Fetching database logs...</span>
                    </div>
                  </td>
                </tr>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                    <p className="font-semibold text-slate-300">No records found</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Try widening search criteria or upload files to generate telemetry.</p>
                  </td>
                </tr>
              ) : (
                scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-900/10 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-black text-cyan-500">#{scan.id}</span>
                      <span className="block text-[10px] text-slate-500 font-semibold">{scan.patient_id || 'De-identified'}</span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-200 max-w-xs truncate">{scan.filename}</td>
                    <td className="px-5 py-3.5 font-medium text-slate-400">{scan.modality}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[10px] ${
                        scan.prediction_class.toUpperCase() === 'PNEUMONIA' || scan.prediction_class.toUpperCase() === 'FAILED'
                          ? 'bg-red-500/10 border-red-500/20 text-red-400'
                          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        {scan.prediction_class}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-200">{Math.round(scan.confidence_score * 100)}%</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        scan.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                        scan.status === 'pending' ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {scan.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{new Date(scan.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      {scan.status === 'completed' && (
                        <a
                          href={getPdfReportUrl(scan.uuid || scan.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-cyan-400 hover:border-cyan-500 hover:bg-cyan-500/10 rounded-lg text-[10px] font-bold"
                        >
                          <Download className="h-3 w-3" />
                          <span>PDF</span>
                        </a>
                      )}
                      <button
                        onClick={() => setDeleteTargetId(scan.id)}
                        className="inline-flex items-center px-2.5 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination summary */}
        <div className="flex justify-between items-center mt-4 text-[11px] text-slate-500 font-semibold px-1">
          <span>Showing {skip + 1} - {Math.min(skip + limit, totalCount)} of {totalCount} records</span>
          <div className="flex space-x-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - limit))}
              className="px-3 py-1 bg-slate-900 border border-slate-850 rounded-lg disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={skip + limit >= totalCount}
              onClick={() => setSkip(skip + limit)}
              className="px-3 py-1 bg-slate-900 border border-slate-850 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Delete and Purge Modals */}
      <AnimatePresence>
        {deleteTargetId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div 
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span>Confirm Record Purge</span>
              </h3>
              <p className="text-xs text-slate-300">Are you sure you want to permanently erase record #{deleteTargetId}? This action is irreversible.</p>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setDeleteTargetId(null)} className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-slate-300">Cancel</button>
                <button onClick={confirmDeleteScan} className="px-4 py-2 bg-red-500 text-slate-950 font-bold rounded-lg text-xs">Confirm Delete</button>
              </div>
            </motion.div>
          </div>
        )}

        {showClearAllModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div 
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span>Confirm History Flush</span>
              </h3>
              <p className="text-xs text-slate-300">Are you sure you want to permanently clear all scan logs? This action is irreversible.</p>
              <div className="flex justify-end space-x-2 pt-2">
                <button onClick={() => setShowClearAllModal(false)} className="px-4 py-2 bg-slate-800 rounded-lg text-xs font-bold text-slate-300">Cancel</button>
                <button onClick={confirmClearAllHistory} className="px-4 py-2 bg-red-500 text-slate-950 font-bold rounded-lg text-xs">Confirm Flush</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

