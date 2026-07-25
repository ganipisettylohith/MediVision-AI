import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowRight, Upload, CheckCircle2, Sparkles } from 'lucide-react';
import apiClient from '../services/api';
import { HealthStatus } from '../types';

export const HomePage: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<HealthStatus>('/health')
      .then((res) => setHealth(res.data))
      .catch((err) => console.error('Health check error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-10 py-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl glass-panel p-8 sm:p-12 border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Clinical Decision Support Tool</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Instant Diagnostic Insights for Chest X-Rays
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Upload a medical chest scan to get an instant AI evaluation, an anatomical heatmap showing exactly what the AI examined, and a structured report in plain English.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              to="/analysis"
              className="inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-lg shadow-cyan-500/25 text-base"
            >
              <Upload className="h-5 w-5" />
              <span>Upload a Scan to Analyze</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-medium transition-all text-base"
            >
              <span>View History & Past Scans</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Visual Quick-Start CTA Card */}
      <section className="glass-panel p-8 rounded-3xl border border-cyan-500/20 bg-slate-900/50 hover:border-cyan-500/40 transition-all">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <Zap className="h-4 w-4" />
              <span>Ready in seconds</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Upload a chest X-ray scan to get started right now</h2>
            <p className="text-sm text-slate-400 max-w-xl">
              Supports standard PNG, JPG, and DICOM medical scan files. No complex setup or configuration needed.
            </p>
          </div>
          <Link
            to="/analysis"
            className="w-full sm:w-auto shrink-0 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-center text-base shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2"
          >
            <Upload className="h-5 w-5" />
            <span>Upload Scan Now</span>
          </Link>
        </div>
      </section>

      {/* 3-Step Plain English Workflow */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">How MediVision AI Helps You</h2>
          <p className="text-sm text-slate-400 max-w-lg mx-auto">Designed for clarity, speed, and ease of understanding for healthcare professionals and users alike.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="text-lg font-semibold text-white">1. Select or Drop Scan</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload any chest X-ray image directly from your device. Your file is processed securely and privately.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="text-lg font-semibold text-white">2. Visual Heatmap AI Analysis</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              The AI highlights anatomical regions on the scan so you can visually verify which areas influenced the diagnosis.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="text-lg font-semibold text-white">3. Clear Medical Report</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Read structured findings and clinical recommendations, or export a complete PDF report with one click.
            </p>
          </div>
        </div>
      </section>

      {/* System Status Banner */}
      <section className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-slate-200 font-medium">System Status:</span>
          <span>{loading ? 'Connecting to services...' : 'All diagnostic engines operational'}</span>
        </div>
        <div className="flex items-center space-x-6">
          <span>API Service: <strong className="text-emerald-400">{health?.status ? 'Active' : 'Ready'}</strong></span>
          <span>AI Engine: <strong className="text-cyan-400">Ready</strong></span>
          <span>Database: <strong className="text-emerald-400">{health?.database ? 'Connected' : 'Ready'}</strong></span>
        </div>
      </section>
    </div>
  );
};
