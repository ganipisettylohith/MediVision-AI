import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, FileText, ShieldCheck, Download, Trash2, Search, Filter, RefreshCw, Calendar, Clock, AlertTriangle, FileScan, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Custom Delete Modal State
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);

  const fetchDashboardData = () => {
    setLoading(true);

    // Fetch Stats
    apiClient.get<Statistics>('/statistics')
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Error fetching statistics:', err));

    // Build params for history query
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Scan History & Analytics</h1>
          <p className="text-sm text-slate-400 mt-0.5">Review past medical scan evaluations, search records, and export PDF diagnostic reports.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
          {scans.length > 0 && (
            <button
              onClick={() => setShowClearAllModal(true)}
              className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* Contextual Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Scans</span>
            <FileText className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats?.total_scans ?? 0}</div>
          <div className="text-[11px] text-slate-500">processed to date</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Normal Scans</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{stats?.normal_scans ?? 0}</div>
          <div className="text-[11px] text-slate-500">clear findings</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pneumonia</span>
            <Activity className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-extrabold text-red-400">{stats?.pneumonia_scans ?? 0}</div>
          <div className="text-[11px] text-slate-500">flagged cases</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Avg Confidence</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400">
            {stats ? `${Math.round(stats.average_confidence * 100)}%` : '0%'}
          </div>
          <div className="text-[11px] text-slate-500">AI accuracy rating</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Scans Today</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats?.todays_scans ?? 0}</div>
          <div className="text-[11px] text-slate-500">recorded today</div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>This Week</span>
            <Calendar className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{stats?.weekly_scans ?? 0}</div>
          <div className="text-[11px] text-slate-500">last 7 days</div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex items-center w-full md:w-96 space-x-2">
          <div className="relative w-full">
            <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by patient ID, filename, or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow">
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center space-x-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterPrediction}
              onChange={(e) => { setFilterPrediction(e.target.value); setSkip(0); }}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
            >
              <option value="">All Diagnoses</option>
              <option value="NORMAL">Normal Only</option>
              <option value="PNEUMONIA">Pneumonia Only</option>
            </select>
          </div>

          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); setSkip(0); }}
            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Scans Table / Empty State */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-slate-200 text-sm">Past Medical Scan Records ({totalCount})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">ID / Patient</th>
                <th className="px-6 py-3.5">File Name</th>
                <th className="px-6 py-3.5">Modality</th>
                <th className="px-6 py-3.5">AI Diagnostic Finding</th>
                <th className="px-6 py-3.5">Confidence</th>
                <th className="px-6 py-3.5">Date & Time</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <RefreshCw className="h-6 w-6 text-cyan-400 animate-spin" />
                      <span className="text-xs">Loading scan records...</span>
                    </div>
                  </td>
                </tr>
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-900 border border-slate-800 text-cyan-400 flex items-center justify-center mx-auto">
                        <FileScan className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-base font-bold text-slate-200">No scan history found</h4>
                        <p className="text-xs text-slate-400">
                          {searchQuery || filterPrediction
                            ? 'No scan records match your active search or diagnosis filters.'
                            : 'No medical scans have been processed yet. Upload your first chest X-ray to start populating records.'}
                        </p>
                      </div>
                      <Link
                        to="/analysis"
                        className="inline-flex items-center space-x-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload Your First Scan</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium">
                      <span className="text-cyan-400 font-bold block">#{scan.id}</span>
                      <span className="text-slate-400 block text-[11px]">{scan.patient_id || 'Unassigned'}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200 max-w-xs truncate">{scan.filename}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{scan.modality}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                        scan.prediction_class.toUpperCase() === 'PNEUMONIA'
                          ? 'bg-red-500/10 text-red-400 border-red-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {scan.prediction_class.toUpperCase() === 'PNEUMONIA' ? 'Pneumonia' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-200">{Math.round(scan.confidence_score * 100)}%</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(scan.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <a
                        href={getPdfReportUrl(scan.uuid || scan.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-400 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </a>
                      <button
                        onClick={() => setDeleteTargetId(scan.id)}
                        className="inline-flex items-center px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Summary Controls */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
          <span>
            Showing <strong className="text-slate-200">{scans.length > 0 ? skip + 1 : 0}</strong> to <strong className="text-slate-200">{Math.min(skip + limit, totalCount)}</strong> of <strong className="text-slate-200">{totalCount}</strong> records
          </span>
          <div className="flex space-x-2">
            <button
              disabled={skip === 0}
              onClick={() => setSkip(Math.max(0, skip - limit))}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center space-x-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>
            <button
              disabled={skip + limit >= totalCount}
              onClick={() => setSkip(skip + limit)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Single Record Confirmation Modal */}
      {deleteTargetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Confirm Record Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete scan record <strong className="text-cyan-400">#{deleteTargetId}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteScan}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All History Confirmation Modal */}
      {showClearAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">Clear All History Records?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              WARNING: This will permanently purge ALL medical scan records and report history from the database.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowClearAllModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearAllHistory}
                className="px-4 py-2 bg-red-500 hover:bg-red-400 text-slate-950 font-bold rounded-xl text-xs"
              >
                Purge History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
