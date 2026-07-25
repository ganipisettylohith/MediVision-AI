import React, { useState, useEffect } from 'react';
import { Upload, FileScan, AlertCircle, Loader2, Eye, Flame, FileText, ChevronDown, ChevronUp, AlertTriangle, Lightbulb, Stethoscope, Sparkles, Download, CheckCircle2 } from 'lucide-react';
import apiClient, { getPdfReportUrl } from '../services/api';
import { AnalysisRecord } from '../types';

export const AnalysisPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [modality, setModality] = useState('X-Ray');
  const [patientId, setPatientId] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [result, setResult] = useState<AnalysisRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overlay' | 'heatmap' | 'original'>('overlay');

  const loadingSteps = [
    { title: 'Uploading image file...', detail: 'Validating file format and size' },
    { title: 'Analyzing with PyTorch AI...', detail: 'Evaluating anatomical scan features' },
    { title: 'Generating Grad-CAM heatmap...', detail: 'Highlighting visual focus regions' },
    { title: 'Synthesizing medical report...', detail: 'Formulating clinical recommendations' },
  ];

  // Collapsible section state for Medical Report Card
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
    let interval: any;
    if (analyzing) {
      setLoadingStage(0);
      interval = setInterval(() => {
        setLoadingStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 750);
    } else {
      setLoadingStage(0);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        setError('File size exceeds the 15MB upload limit. Please select a smaller scan image.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a chest scan image file to upload.');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('modality', modality);
    if (patientId) formData.append('patient_id', patientId);

    try {
      const res = await apiClient.post<AnalysisRecord>('/analysis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err: any) {
      const status = err.response?.status || err.status;
      const serverDetail = err.response?.data?.detail || err.message;
      
      if (err.code === 'ERR_NETWORK' || (!err.response && !status)) {
        setError('🌐 Network Connection Issue — Unable to reach MediVision servers. Please check your internet connection and try again.');
      } else if (status === 503 || (serverDetail && serverDetail.includes('out of service'))) {
        setError('⚠️ AI Diagnostic Engine is temporarily out of service. Please try again shortly.');
      } else if (status === 413) {
        setError('File size is too large. Please select a scan under 15MB.');
      } else if (status === 400) {
        setError(serverDetail || 'The uploaded file appears to be corrupted or is not a valid image file.');
      } else {
        setError(serverDetail || '⚠️ AI Diagnostic Engine is temporarily out of service or unreachable. Please try again shortly.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const getImageUrl = (urlPath?: string) => {
    if (!urlPath) return undefined;
    if (urlPath.startsWith('http')) return urlPath;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const serverHost = baseUrl.replace('/api/v1', '');
    return `${serverHost}${urlPath}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Scan Upload & AI Diagnostics</h1>
        <p className="text-sm text-slate-400 mt-1">Upload a chest scan image to get instant AI classification, anatomical heatmaps, and a clear medical report.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Form Column */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">1. Scan Modality Type</label>
              <select
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              >
                <option value="X-Ray">Chest X-Ray (Local PyTorch Deep Learning Model)</option>
                <option value="MRI">Brain / Spine MRI (Gemini Vision)</option>
                <option value="CT">Computed Tomography CT (Gemini Vision)</option>
                <option value="Mammography">Mammography Scan (Gemini Vision)</option>
                <option value="ECG">ECG / Cardiac Trace (Gemini Vision)</option>
              </select>
            </div>

            {modality !== 'X-Ray' && (
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-300 text-xs flex items-start space-x-2.5">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                <span className="leading-relaxed">
                  This scan will be processed by the <strong>Google Gemini Vision</strong> multimodal engine. (Grad-CAM heatmaps are local to PyTorch and will be bypassed).
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">2. Patient Name / ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. PAT-9042 or John Doe"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-3 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">3. Upload Chest Scan File</label>
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 text-center transition-all bg-slate-900/40 group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="image-upload-input"
                />
                <label htmlFor="image-upload-input" className="space-y-3 block cursor-pointer">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Scan Preview" className="h-44 max-w-full mx-auto rounded-xl object-cover border border-slate-700 shadow-md" />
                  ) : (
                    <div className="h-14 w-14 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-all flex items-center justify-center mx-auto">
                      <Upload className="h-7 w-7" />
                    </div>
                  )}
                  <span className="block text-sm font-semibold text-slate-200">
                    {selectedFile ? selectedFile.name : 'Click to select or drop chest scan here'}
                  </span>
                  <span className="block text-xs text-slate-400">Supports PNG, JPG, JPEG or DICOM images (Max 15MB)</span>
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex items-start space-x-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={analyzing || !selectedFile}
              className="w-full py-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-extrabold text-base rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing Scan...</span>
                </>
              ) : (
                <>
                  <FileScan className="h-5 w-5" />
                  <span>Start AI Diagnostic Analysis</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results & Visual Insights Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 min-h-[500px] flex flex-col justify-between">
            {analyzing ? (
              /* Staged Intentional Progress Loading State */
              <div className="my-auto py-12 space-y-8 max-w-md mx-auto text-center">
                <div className="relative inline-flex items-center justify-center">
                  <div className="h-20 w-20 rounded-full bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center animate-pulse">
                    <Sparkles className="h-10 w-10 text-cyan-400 animate-spin" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Analyzing Chest Scan...</h3>
                  <p className="text-sm text-slate-400">Evaluating image patterns and generating diagnostic report</p>
                </div>

                {/* Staged steps list */}
                <div className="space-y-3 text-left bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                  {loadingSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center space-x-3 text-xs">
                      {idx < loadingStage ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : idx === loadingStage ? (
                        <Loader2 className="h-4 w-4 text-cyan-400 animate-spin shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border border-slate-700 shrink-0"></div>
                      )}
                      <div className="flex-1">
                        <span className={`font-medium ${idx <= loadingStage ? 'text-slate-200' : 'text-slate-500'}`}>
                          {step.title}
                        </span>
                        {idx === loadingStage && (
                          <span className="block text-[11px] text-cyan-400 mt-0.5">{step.detail}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : result ? (
              /* Diagnostic Results View */
              <div className="space-y-6">
                {/* Prominent Eye-Catching Prediction Header */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {result.modality === 'X-Ray' ? 'AI Diagnostic Classification' : 'Multimodal AI Assessment'}
                      </span>
                      <div className="flex items-center space-x-3">
                        <span className={`px-4 py-1.5 rounded-full text-lg font-extrabold border shadow-sm ${
                          (result.modality === 'X-Ray' && result.prediction_class.toUpperCase() === 'PNEUMONIA') || (result.modality !== 'X-Ray' && result.prediction_class.toUpperCase() !== 'NORMAL')
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}>
                          {result.modality === 'X-Ray' 
                            ? (result.prediction_class.toUpperCase() === 'PNEUMONIA' ? 'Pneumonia Indicated' : 'Normal / No Infiltrates')
                            : result.prediction_class}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-left sm:text-right">
                        <span className="text-xs text-slate-400 block font-medium">
                          {result.modality === 'X-Ray' ? 'Model Confidence' : 'AI Confidence Rating'}
                        </span>
                        <span className={`text-3xl font-extrabold ${
                          result.confidence_score >= 0.85 ? 'text-cyan-400' : 'text-amber-400'
                        }`}>
                          {Math.round(result.confidence_score * 100)}%
                        </span>
                      </div>
                      <a
                        href={getPdfReportUrl(result.uuid || result.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition-all"
                      >
                        <Download className="h-4 w-4" />
                        <span>PDF Report</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* Analysis Pipeline Info */}
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">Analysis Pipeline Used</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800/60">
                    <div>
                      <span className="block text-slate-500 mb-1 text-[11px] uppercase tracking-wider font-bold">Primary AI Engine</span>
                      <span className="text-cyan-400 font-semibold text-sm">
                        {result.modality === 'X-Ray' ? 'Local PyTorch Deep Learning Model' : 'Google Gemini Vision'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1 text-[11px] uppercase tracking-wider font-bold">Explainability</span>
                      <span className="text-slate-300 font-semibold text-sm">
                        {result.modality === 'X-Ray' ? 'Grad-CAM Enabled' : 'AI Text Interpretation'}
                      </span>
                    </div>
                    <div>
                      <span className="block text-slate-500 mb-1 text-[11px] uppercase tracking-wider font-bold">Grad-CAM Status</span>
                      <span className="text-slate-300 font-semibold text-sm">
                        {result.modality === 'X-Ray' ? 'Active & Rendered' : 'Not Available for Gemini Vision'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual AI Heatmap Section */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-cyan-400" />
                        <span>Visual AI Focus Map (Grad-CAM)</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        This heatmap highlights the exact anatomical regions of the scan that most influenced the AI's decision.
                      </p>
                    </div>

                    <div className="flex space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs shrink-0 self-start sm:self-auto">
                      <button
                        onClick={() => setActiveTab('overlay')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          activeTab === 'overlay' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Combined View
                      </button>
                      <button
                        onClick={() => setActiveTab('heatmap')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          activeTab === 'heatmap' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        AI Heatmap
                      </button>
                      <button
                        onClick={() => setActiveTab('original')}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                          activeTab === 'original' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Original Scan
                      </button>
                    </div>
                  </div>

                  {/* Main Display Window */}
                  <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-950 aspect-video flex items-center justify-center p-2">
                    {activeTab === 'overlay' && result.overlay_url && (
                      <img src={getImageUrl(result.overlay_url)} alt="Combined View" className="max-h-full max-w-full rounded-xl object-contain" />
                    )}
                    {activeTab === 'heatmap' && result.heatmap_url && (
                      <img src={getImageUrl(result.heatmap_url)} alt="Heatmap" className="max-h-full max-w-full rounded-xl object-contain" />
                    )}
                    {activeTab === 'original' && result.original_url && (
                      <img src={getImageUrl(result.original_url)} alt="Original Scan" className="max-h-full max-w-full rounded-xl object-contain" />
                    )}
                  </div>
                </div>

                {/* Thumbnail selector grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div
                    onClick={() => setActiveTab('original')}
                    className={`cursor-pointer rounded-xl border p-2 text-center transition-all ${
                      activeTab === 'original' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">1. Original Scan</span>
                    {result.original_url && <img src={getImageUrl(result.original_url)} alt="Original" className="h-16 w-full rounded-lg object-cover" />}
                  </div>

                  <div
                    onClick={() => setActiveTab('heatmap')}
                    className={`cursor-pointer rounded-xl border p-2 text-center transition-all ${
                      activeTab === 'heatmap' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">2. AI Heatmap</span>
                    {result.heatmap_url && <img src={getImageUrl(result.heatmap_url)} alt="Heatmap" className="h-16 w-full rounded-lg object-cover" />}
                  </div>

                  <div
                    onClick={() => setActiveTab('overlay')}
                    className={`cursor-pointer rounded-xl border p-2 text-center transition-all ${
                      activeTab === 'overlay' ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <span className="block text-[11px] font-semibold text-slate-300 mb-1">3. Combined View</span>
                    {result.overlay_url && <img src={getImageUrl(result.overlay_url)} alt="Overlay" className="h-16 w-full rounded-lg object-cover" />}
                  </div>
                </div>

                {/* Structured Medical Report Accordion */}
                {result.medical_report && (
                  <div className="space-y-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <Sparkles className="h-5 w-5" />
                      <h3 className="font-bold text-lg text-slate-100">Structured Medical Report</h3>
                    </div>

                    <div className="space-y-3">
                      {/* Executive Summary */}
                      <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                        <button
                          onClick={() => toggleSection('summary')}
                          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-cyan-400 uppercase hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="flex items-center space-x-2">
                            <FileText className="h-4 w-4" />
                            <span>1. Executive Summary</span>
                          </span>
                          {collapsedSections.summary ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        {!collapsedSections.summary && (
                          <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-slate-800/60 leading-relaxed">
                            {result.medical_report.summary}
                          </div>
                        )}
                      </div>

                      {/* Image Findings */}
                      <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                        <button
                          onClick={() => toggleSection('findings')}
                          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-cyan-400 uppercase hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="flex items-center space-x-2">
                            <Stethoscope className="h-4 w-4" />
                            <span>2. Image Findings</span>
                          </span>
                          {collapsedSections.findings ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        {!collapsedSections.findings && (
                          <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-slate-800/60 leading-relaxed">
                            {result.medical_report.findings}
                          </div>
                        )}
                      </div>

                      {/* AI Visual Analysis */}
                      <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                        <button
                          onClick={() => toggleSection('interpretation')}
                          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-cyan-400 uppercase hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="flex items-center space-x-2">
                            <Flame className="h-4 w-4" />
                            <span>3. Visual Heatmap Interpretation</span>
                          </span>
                          {collapsedSections.interpretation ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        {!collapsedSections.interpretation && (
                          <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-slate-800/60 leading-relaxed">
                            {result.medical_report.interpretation}
                          </div>
                        )}
                      </div>

                      {/* Recommendations */}
                      <div className="bg-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
                        <button
                          onClick={() => toggleSection('recommendations')}
                          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-cyan-400 uppercase hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="flex items-center space-x-2">
                            <Lightbulb className="h-4 w-4" />
                            <span>4. Clinical Recommendations</span>
                          </span>
                          {collapsedSections.recommendations ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        {!collapsedSections.recommendations && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-800/60">
                            <ul className="space-y-2">
                              {result.medical_report.recommendations.map((rec, idx) => (
                                <li key={idx} className="flex items-start space-x-2.5 text-sm text-slate-300">
                                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Clinical Notice */}
                      <div className="bg-amber-500/10 rounded-xl border border-amber-500/20 overflow-hidden">
                        <button
                          onClick={() => toggleSection('disclaimer')}
                          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-amber-400 uppercase hover:bg-amber-500/5 transition-colors"
                        >
                          <span className="flex items-center space-x-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span>5. Important Clinical Notice</span>
                          </span>
                          {collapsedSections.disclaimer ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </button>
                        {!collapsedSections.disclaimer && (
                          <div className="px-4 pb-4 pt-1 text-xs text-amber-300/90 border-t border-amber-500/20 leading-relaxed italic">
                            {result.medical_report.disclaimer}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Idle Empty State */
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3 py-16 text-center my-auto">
                <div className="h-16 w-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400">
                  <FileScan className="h-8 w-8" />
                </div>
                <div className="space-y-1 max-w-sm">
                  <span className="block text-base font-semibold text-slate-300">Awaiting Scan Upload</span>
                  <span className="block text-xs text-slate-400">Upload a chest scan image on the left and click "Start AI Diagnostic Analysis" to view results.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
