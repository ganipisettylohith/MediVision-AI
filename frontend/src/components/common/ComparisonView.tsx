import React, { useState, useEffect } from 'react';
import { Columns, ArrowRightLeft, FileText, CheckCircle } from 'lucide-react';
import apiClient from '../../services/api';
import { AnalysisRecord } from '../../types';

interface ComparisonViewProps {
  currentScan: AnalysisRecord;
  onLinked?: () => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ currentScan, onLinked }) => {
  const [priorScans, setPriorScans] = useState<AnalysisRecord[]>([]);
  const [selectedPriorId, setSelectedPriorId] = useState<number | null>(null);
  const [priorScanDetail, setPriorScanDetail] = useState<AnalysisRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);

  // Fetch candidate prior scans for the same patient ID
  useEffect(() => {
    if (currentScan.patient_id) {
      setLoading(true);
      apiClient.get<any>('/analysis', { params: { skip: 0, limit: 100 } })
        .then(res => {
          // Filter scans with same patient ID, excluding current scan
          const scans: AnalysisRecord[] = res.data.scans || [];
          const filtered = scans.filter(s => s.patient_id === currentScan.patient_id && s.id !== currentScan.id);
          setPriorScans(filtered);
        })
        .catch(err => console.error('Error fetching priors:', err))
        .finally(() => setLoading(false));
    }
  }, [currentScan.patient_id, currentScan.id]);

  // Load prior details if already linked or selected
  useEffect(() => {
    const activePriorId = currentScan.prior_scan_id || selectedPriorId;
    if (activePriorId) {
      apiClient.get<AnalysisRecord>(`/analysis/${activePriorId}/status`)
        .then(res => setPriorScanDetail(res.data))
        .catch(err => console.error('Error loading prior scan detail:', err));
    } else {
      setPriorScanDetail(null);
    }
  }, [currentScan.prior_scan_id, selectedPriorId]);

  const handleLink = async () => {
    if (!selectedPriorId) return;
    setLinking(true);
    try {
      const formData = new FormData();
      formData.append('prior_scan_id', selectedPriorId.toString());
      await apiClient.post(`/analysis/${currentScan.id}/link-prior`, formData);
      if (onLinked) onLinked();
    } catch (err) {
      console.error('Error linking prior:', err);
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-6 bg-slate-950/30">
      <div className="flex items-center space-x-3 text-cyan-400">
        <Columns className="h-5 w-5" />
        <h3 className="font-bold text-sm uppercase tracking-wider text-white">Prior Study Comparison</h3>
      </div>

      {/* Select Prior Scan to Link if not linked yet */}
      {!currentScan.prior_scan_id && (
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-slate-400">Select prior scan for Patient {currentScan.patient_id || 'Anonymous'}:</label>
          <div className="flex gap-2">
            <select
              value={selectedPriorId || ''}
              onChange={(e) => setSelectedPriorId(Number(e.target.value) || null)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">-- Choose Prior Scan --</option>
              {priorScans.map(scan => (
                <option key={scan.id} value={scan.id}>
                  Scan #{scan.id} - {scan.modality} ({scan.prediction_class}) - {new Date(scan.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
            <button
              onClick={handleLink}
              disabled={!selectedPriorId || linking}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              {linking ? 'Linking...' : 'Compare'}
            </button>
          </div>
        </div>
      )}

      {/* Side-by-side or Highlighted comparison panel */}
      {priorScanDetail && (
        <div className="space-y-4">
          <div className="p-3 bg-cyan-950/20 border border-cyan-850 rounded-2xl flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 font-bold uppercase flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5" />
              Prior Study Linked Successfully
            </span>
            <span className="text-[10px] text-slate-400 font-bold">
              Prior Scan #{priorScanDetail.id}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Prior Findings */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Prior Scan Results</span>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-white">{priorScanDetail.filename}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-bold uppercase">
                  {priorScanDetail.prediction_class}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed italic">{priorScanDetail.findings_summary}</p>
            </div>

            {/* Current Findings */}
            <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-2">
              <span className="text-[10px] text-cyan-500 uppercase font-bold block">Current Scan Results</span>
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-white">{currentScan.filename}</span>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-[10px] text-cyan-400 font-bold uppercase">
                  {currentScan.prediction_class}
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed italic">{currentScan.findings_summary}</p>
            </div>
          </div>

          {currentScan.medical_report && (
            <div className="p-4 bg-slate-900/20 border border-slate-850 rounded-2xl space-y-2">
              <span className="text-[10px] text-cyan-400 font-bold uppercase block flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Evolutionary / Delta Interpretation
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                {currentScan.medical_report.interpretation}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
