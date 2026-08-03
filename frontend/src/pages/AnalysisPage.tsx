import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileScan, AlertCircle, Loader2, Eye, Flame, FileText, ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Stethoscope, Sparkles, Download, CheckCircle2, RefreshCw, FileSpreadsheet } from 'lucide-react';
import apiClient, { getPdfReportUrl } from '../services/api';
import { AnalysisRecord } from '../types';
import { SliceViewer } from '../components/common/SliceViewer';
import { ComparisonView } from '../components/common/ComparisonView';
import { useAuth } from '../context/AuthContext';
import { ReasoningTracePanel } from '../components/common/ReasoningTracePanel';

export const AnalysisPage: React.FC = () => {
  const { user } = useAuth();
  const [uploadType, setUploadType] = useState<'scan' | 'document'>('scan');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modality, setModality] = useState('X-Ray');
  const [patientId, setPatientId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [pollIntervalId, setPollIntervalId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const [docResult, setDocResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState<number>(50); // 0 to 100
  const [compareMode, setCompareMode] = useState<'overlay' | 'heatmap' | 'original'>('overlay');

  const [isDragOver, setIsDragOver] = useState(false);

  // Collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    summary: false,
    findings: false,
    interpretation: false,
    recommendations: false,
    disclaimer: false,
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    return () => {
      if (pollIntervalId) clearInterval(pollIntervalId);
    };
  }, [pollIntervalId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxLimit = uploadType === 'scan' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxLimit) {
        setError(`File size exceeds limit (${uploadType === 'scan' ? '15MB' : '10MB'}).`);
        return;
      }
      setSelectedFile(file);
      setError(null);

      if (uploadType === 'scan' && !file.name.toLowerCase().endsWith('.dcm')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null); // No preview for DICOM or PDF documents
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const maxLimit = uploadType === 'scan' ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxLimit) {
        setError(`File size exceeds limit.`);
        return;
      }
      setSelectedFile(file);
      setError(null);
      if (uploadType === 'scan' && !file.name.toLowerCase().endsWith('.dcm')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  // Poll analysis task status
  const startPolling = (scanId: number) => {
    setStatusMessage('Job queued. Waiting for server thread...');
    setProgressPercent(15);
    
    const interval = window.setInterval(async () => {
      try {
        const res = await apiClient.get<AnalysisRecord>(`/analysis/${scanId}/status`);
        const job = res.data;
        
        if (job.status === 'processing') {
          setStatusMessage('Running deep neural net inference & XAI...');
          setProgressPercent(50);
        } else if (job.status === 'completed') {
          setStatusMessage('Diagnosis complete!');
          setProgressPercent(100);
          setResult(job);
          setAnalyzing(false);
          if (pollIntervalId) {
            clearInterval(pollIntervalId);
            setPollIntervalId(null);
          }
        } else if (job.status === 'failed') {
          setError(job.error_message || 'Inference engine failed to evaluate image.');
          setAnalyzing(false);
          if (pollIntervalId) {
            clearInterval(pollIntervalId);
            setPollIntervalId(null);
          }
        }
      } catch (err: any) {
        setError('Failed checking diagnostic job status.');
        setAnalyzing(false);
        if (pollIntervalId) {
          clearInterval(pollIntervalId);
          setPollIntervalId(null);
        }
      }
    }, 1500);

    setPollIntervalId(interval);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);
    setDocResult(null);
    setProgressPercent(5);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (patientId) formData.append('patient_id', patientId);

    if (uploadType === 'scan') {
      formData.append('modality', modality);
      try {
        setStatusMessage('Ingesting image payload...');
        const res = await apiClient.post<AnalysisRecord>('/analysis', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        startPolling(res.data.id);
      } catch (err: any) {
        setError(err.message || 'Server upload failed.');
        setAnalyzing(false);
      }
    } else {
      // Document upload flow
      try {
        setStatusMessage('Extracting report syntax via OCR / parsing...');
        setProgressPercent(40);
        const res = await apiClient.post<any>('/documents', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setProgressPercent(100);
        setDocResult(res.data);
        setAnalyzing(false);
      } catch (err: any) {
        setError(err.message || 'Document ingestion failed.');
        setAnalyzing(false);
      }
    }
  };

  const getImageUrl = (urlPath?: string) => {
    if (!urlPath) return undefined;
    if (urlPath.startsWith('http')) return urlPath;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const serverHost = baseUrl.replace('/api/v1', '');
    return `${serverHost}${urlPath}`;
  };

  const modalities = ["X-Ray", "CT", "MRI", "PET", "Ultrasound", "Mammography"];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">AI Diagnostics & Ingestion Panel</h1>
          <p className="text-sm text-slate-400 mt-1">Upload clinical image scans or text/PDF laboratory summaries for deep learning analysis.</p>
        </div>

        {/* Upload Mode Toggle */}
        <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => { setUploadType('scan'); setSelectedFile(null); setPreviewUrl(null); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${uploadType === 'scan' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Imaging Scan
          </button>
          <button
            onClick={() => { setUploadType('document'); setSelectedFile(null); setPreviewUrl(null); setError(null); }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${uploadType === 'document' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            Medical Document
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Upload Zone */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6 bg-slate-950/40">
            {uploadType === 'scan' && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">1. Target Modality</label>
                <div className="grid grid-cols-3 gap-2">
                  {modalities.map((mod) => (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => setModality(mod)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${modality === mod ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-glow-cyan' : 'border-slate-800 hover:border-slate-700 bg-slate-900/50 text-slate-300'}`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {uploadType === 'scan' ? '2. Patient ID (Optional)' : '1. Patient ID / MRN (Optional)'}
              </label>
              <input
                type="text"
                placeholder="e.g. PAT-0817 or MRN-902"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {uploadType === 'scan' ? '3. Scan Image / DICOM file' : '2. Clinical PDF / TXT Document'}
              </label>
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-800 hover:border-cyan-500/30 bg-slate-900/20'}`}
              >
                <input
                  type="file"
                  accept={uploadType === 'scan' ? 'image/*,.dcm' : '.pdf,.txt'}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="picker-input"
                />
                <label htmlFor="picker-input" className="space-y-4 block cursor-pointer">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Scan Preview" className="h-44 max-w-full mx-auto rounded-xl object-cover border border-slate-700 shadow-md" />
                  ) : (
                    <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
                      {uploadType === 'scan' ? <FileScan className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="block text-sm font-semibold text-slate-200">
                      {selectedFile ? selectedFile.name : `Click or Drag file here`}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {uploadType === 'scan' ? 'Supports standard JPEG, PNG, or .dcm DICOM (Max 15MB)' : 'Supports clinical summaries in PDF or TXT format (Max 10MB)'}
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-start space-x-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={analyzing || !selectedFile}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-base rounded-xl transition-all shadow-glow-cyan flex items-center justify-center space-x-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing async queue...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  <span>{uploadType === 'scan' ? 'Start AI Scan Diagnostics' : 'Ingest Report Intelligence'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Side: Results Display */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 min-h-[520px] flex flex-col justify-between bg-slate-950/40 relative">
            
            <AnimatePresence mode="wait">
              {analyzing ? (
                /* Polling Progress Overlay */
                <motion.div 
                  key="loading"
                  className="my-auto py-12 space-y-8 max-w-md mx-auto text-center w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="relative inline-flex items-center justify-center">
                    <div className="h-24 w-24 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <RefreshCw className="h-10 w-10 text-cyan-400 animate-spin" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-white">Diagnostic Thread Active</h3>
                      <p className="text-sm text-slate-400">{statusMessage}</p>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-cyan-500 h-full shadow-glow-cyan"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ) : result ? (
                /* Scan Results */
                <motion.div 
                  key="scan-result"
                  className="space-y-6 w-full"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Results Header */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Prediction Finding</span>
                      <h2 className="text-2xl font-extrabold text-white">{result.prediction_class}</h2>
                    </div>

                    <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confidence Score</span>
                        <span className="block text-2xl font-black text-cyan-400">{Math.round(result.confidence_score * 100)}%</span>
                      </div>
                      <a
                        href={getPdfReportUrl(result.uuid || result.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center space-x-1.5 shadow-glow-cyan"
                      >
                        <Download className="h-4 w-4" />
                        <span>PDF Report</span>
                      </a>
                    </div>
                  </div>

                  {/* Multi-slice Stack Viewer (Task 3) or Single scan Grad-CAM Overlay */}
                  {result.series ? (
                    <SliceViewer series={result.series} />
                  ) : result.heatmap_url && result.original_url ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                            <Eye className="h-4 w-4 text-cyan-400" />
                            <span>Visual Heatmap Overlay</span>
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400">Opacity: {overlayOpacity}%</span>
                        </div>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video flex items-center justify-center p-2">
                        {/* Original Image as base */}
                        <img 
                          src={getImageUrl(result.original_url)} 
                          alt="Original Scan" 
                          className="max-h-full max-w-full rounded-xl object-contain absolute z-0" 
                        />
                        {/* Heatmap Image overlay with adjustable opacity */}
                        <img 
                          src={getImageUrl(result.heatmap_url)} 
                          alt="Heatmap overlay" 
                          className="max-h-full max-w-full rounded-xl object-contain absolute z-10 mix-blend-screen pointer-events-none"
                          style={{ opacity: overlayOpacity / 100 }} 
                        />
                      </div>

                      {/* Slider Input */}
                      <div className="flex items-center space-x-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <span className="text-xs text-slate-500">Scan</span>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          value={overlayOpacity}
                          onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                          className="flex-1 accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                        />
                        <span className="text-xs text-cyan-400 font-bold">XAI Heatmap</span>
                      </div>
                    </div>
                    ) : null}

                  {/* Prior study comparison view (Task 4) */}
                  {result.patient_id && (
                    <ComparisonView 
                      currentScan={result} 
                      onLinked={() => {
                        apiClient.get<AnalysisRecord>(`/analysis/${result.id}/status`)
                          .then(res => setResult(res.data));
                      }} 
                    />
                  )}

                  {/* Structured Report Accordion */}
                  {result.medical_report && (
                    <div className="space-y-3 border-t border-slate-900 pt-4">
                      <div className="flex items-center space-x-2 text-cyan-400">
                        <Sparkles className="h-4 w-4" />
                        <span className="font-bold text-sm">Diagnostic report summary</span>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Executive Summary */}
                        <div className="bg-slate-900/40 rounded-xl border border-slate-800/80">
                          <button 
                            type="button"
                            onClick={() => toggleSection('summary')} 
                            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-cyan-400 uppercase tracking-wider hover:bg-slate-900 transition-colors rounded-xl"
                          >
                            <span>1. Executive Summary</span>
                            {collapsedSections.summary ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </button>
                          {!collapsedSections.summary && (
                            <div className="px-4 pb-4 border-t border-slate-900 pt-3">
                              <p className="text-slate-300 text-sm leading-relaxed">{result.medical_report.summary}</p>
                              {result.medical_report.qualitative_confidence && (
                                <div className="mt-3 p-3 bg-cyan-950/20 border border-cyan-850 rounded-xl space-y-1">
                                  <span className="text-[10px] text-cyan-400 font-bold uppercase block">Qualitative Confidence Band</span>
                                  <span className="text-sm font-semibold text-white capitalize">{result.medical_report.qualitative_confidence}</span>
                                  <p className="text-xs text-slate-400">{result.medical_report.confidence_justification}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Findings */}
                        <div className="bg-slate-900/40 rounded-xl border border-slate-800/80">
                          <button 
                            type="button"
                            onClick={() => toggleSection('findings')} 
                            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-cyan-400 uppercase tracking-wider hover:bg-slate-900 transition-colors rounded-xl"
                          >
                            <span>2. Clinical Findings</span>
                            {collapsedSections.findings ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </button>
                          {!collapsedSections.findings && (
                            <div className="px-4 pb-4 border-t border-slate-900 pt-3 space-y-3">
                              <p className="text-slate-300 text-sm leading-relaxed">{result.medical_report.findings}</p>
                              
                              {/* Structured Findings Cards (Task 1) */}
                              {(result.structured_findings || result.medical_report.structured_findings) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                  {(result.structured_findings || result.medical_report.structured_findings)?.map((finding, idx) => {
                                    const severityColors = {
                                      normal: 'bg-green-500/10 border-green-500/30 text-green-400',
                                      mild: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
                                      moderate: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
                                      severe: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
                                      critical: 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                                    };
                                    const colorClass = severityColors[finding.severity] || 'bg-slate-800 border-slate-700 text-slate-300';
                                    
                                    return (
                                      <div key={idx} className="p-3 bg-slate-950/45 border border-slate-850 rounded-xl space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-sm text-slate-200">{finding.label}</span>
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${colorClass}`}>
                                            {finding.severity}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                                          <div>
                                            <span className="block text-[9px] text-slate-500 uppercase font-bold">Region</span>
                                            <span>{finding.body_region}</span>
                                          </div>
                                          <div>
                                            <span className="block text-[9px] text-slate-500 uppercase font-bold">Confidence</span>
                                            <span>{Math.round(finding.confidence * 100)}%</span>
                                          </div>
                                        </div>
                                        <p className="text-[11px] text-slate-350 italic">{finding.location_description}</p>
                                        {finding.icd10_hint && (
                                          <div className="inline-block px-1.5 py-0.5 bg-slate-900 rounded text-[9px] text-cyan-400 font-bold border border-cyan-500/20">
                                            ICD-10: {finding.icd10_hint}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Clinical Recommendations */}
                        <div className="bg-slate-900/40 rounded-xl border border-slate-800/80">
                          <button 
                            type="button"
                            onClick={() => toggleSection('recommendations')} 
                            className="w-full flex items-center justify-between p-4 text-left font-bold text-xs text-cyan-400 uppercase tracking-wider hover:bg-slate-900 transition-colors rounded-xl"
                          >
                            <span>3. Recommendations</span>
                            {collapsedSections.recommendations ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                          </button>
                          {!collapsedSections.recommendations && (
                            <div className="px-4 pb-4 border-t border-slate-900 pt-3">
                              <ul className="space-y-1 text-sm text-slate-300">
                                {result.medical_report.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 mt-2"></span>
                                    <span>{rec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reasoning Audit Trace (Task 5) */}
                  {(user?.role === 'admin' || user?.role === 'clinician') && (
                    <div className="mt-4 border-t border-slate-900 pt-4">
                      <ReasoningTracePanel scanId={result.id} />
                    </div>
                  )}
                </motion.div>
              ) : docResult ? (
                /* Document structured parsing result */
                <motion.div 
                  key="doc-result"
                  className="space-y-6 w-full"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  {docResult.needs_review && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl text-yellow-400 text-xs flex items-start space-x-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">OCR Low-Confidence Review Required</span>
                        <span>The extracted text contains noisy or insufficient characters. Please verify details manually.</span>
                      </div>
                    </div>
                  )}

                  <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-950 border border-slate-800 space-y-4">
                    <div className="flex items-center space-x-3 text-cyan-400">
                      <FileSpreadsheet className="h-6 w-6" />
                      <h2 className="text-xl font-bold text-white">Ingested Document Report</h2>
                    </div>
                    <p className="text-xs text-slate-400">Successfully extracted clinical findings, labs, and patients profile metrics from document: <strong>{docResult.filename}</strong></p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Patient Profile Name</span>
                      <span className="block text-sm font-semibold text-slate-200">{docResult.extracted_data.patient_name || 'N/A'}</span>
                    </div>
                    <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Patient ID / MRN</span>
                      <span className="block text-sm font-semibold text-slate-200">{docResult.extracted_data.patient_id || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Flagged Abnormal Labs */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Flagged Abnormal Labs / Indicators</span>
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {docResult.extracted_data.flagged_abnormal_labs.length > 0 ? (
                        docResult.extracted_data.flagged_abnormal_labs.map((lab: string, i: number) => (
                          <span key={i} className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 border border-red-500/30 text-red-400 animate-pulse">
                            {lab}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">No abnormal values explicitly flagged.</span>
                      )}
                    </div>
                  </div>

                  {/* Clinical Summary */}
                  <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Clinical Summary</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{docResult.extracted_data.clinical_summary}</p>
                  </div>

                  {/* Extracted Key-Values Grid */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Extracted Test Metrics</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(docResult.extracted_data.key_values || {}).map(([key, val]: any) => (
                        <div key={key} className="p-3 bg-slate-900/30 border border-slate-850 rounded-lg">
                          <span className="block text-[10px] text-slate-500 font-medium truncate" title={key}>{key}</span>
                          <span className="text-xs font-bold text-slate-200">{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : error ? (
                /* Illustrated Error State Panel (Task 7) */
                <motion.div 
                  key="error-panel"
                  className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20 text-center my-auto w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    {error.includes('429') ? (
                      <AlertTriangle className="h-8 w-8 animate-bounce" />
                    ) : (
                      <AlertCircle className="h-8 w-8" />
                    )}
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <span className="block text-base font-semibold text-slate-200">
                      {error.includes('429') ? 'Rate Limit Exceeded' : 'Diagnostic Pipeline Error'}
                    </span>
                    <span className="block text-xs text-slate-400">
                      {error.includes('429') 
                        ? 'You have sent too many requests. Please wait a minute before making another upload.'
                        : error}
                    </span>
                  </div>
                  <button
                    onClick={() => { setError(null); setAnalyzing(false); }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 rounded-xl transition-all"
                  >
                    Dismiss
                  </button>
                </motion.div>
              ) : (
                /* Idle view */
                <motion.div 
                  key="idle"
                  className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 py-20 text-center my-auto w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                    <FileScan className="h-8 w-8" />
                  </div>
                  <div className="space-y-1 max-w-sm">
                    <span className="block text-base font-semibold text-slate-300">Awaiting payload</span>
                    <span className="block text-xs text-slate-400">
                      {uploadType === 'scan' ? 'Upload a chest/modality scan on the left and start diagnostic analysis' : 'Upload a lab PDF report to run text intelligence extraction'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>
    </div>
  );
};
