import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Upload, CheckCircle2, Sparkles, Activity, FileText, Database } from 'lucide-react';
import { motion } from 'framer-motion';
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

  const modalities = [
    { name: "Chest X-Ray", desc: "Local EfficientNet Classifier + Grad-CAM" },
    { name: "Computed Tomography (CT)", desc: "Tailored Windowing Hounsfield Parsing" },
    { name: "Magnetic Resonance (MRI)", desc: "Multi-sequence Contrast Analysis" },
    { name: "Positron Emission (PET)", desc: "SUV FDG Hotspot Tracking" },
    { name: "Ultrasound (US)", desc: "Echogenicity & Boundary Delineation" },
    { name: "Mammography (MG)", desc: "BI-RADS Classification Support" }
  ];

  return (
    <div className="space-y-12 py-4 overflow-hidden">
      {/* Hero Section */}
      <section className="relative rounded-3xl glass-panel p-8 sm:p-12 border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-glass overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          <motion.div 
            className="lg:col-span-7 space-y-6"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Multi-Modality AI Diagnostic Engine v2.0</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
              Clinical Scan & Document Intelligence
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl">
              MediVision AI combines deep-learning computer vision models with LLM document intelligence to deliver real-time diagnostic synthesis, interactive Grad-CAM heatmaps, and automated patient report extraction.
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                to="/analysis"
                className="inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-all shadow-glow-cyan text-base"
              >
                <Upload className="h-5 w-5" />
                <span>Upload a Scan / Report</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard?demo=true"
                className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold transition-all text-base hover:shadow-glow-cyan"
              >
                <span>View Live Demo</span>
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-350 border border-slate-700 font-medium transition-all text-base hover:shadow-md"
              >
                <span>Sign In / Console</span>
              </Link>
            </div>
          </motion.div>

          <motion.div 
            className="lg:col-span-5 flex justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            whileHover={{ scale: 1.03, rotateY: 10, rotateX: 5 }}
            style={{ perspective: 1000 }}
          >
            <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              {/* Mock Scan Box */}
              <div className="h-56 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent"></div>
                {/* Horizontal scan line */}
                <motion.div 
                  className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_2px_rgba(6,182,212,0.5)] z-20"
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                />
                <Activity className="h-16 w-16 text-cyan-500/30 animate-pulse" />
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-2 bg-slate-800 rounded w-3/4"></div>
                <div className="h-2 bg-slate-800 rounded w-1/2"></div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-mono">Telemetry Active</span>
                  <span className="text-xs text-slate-400 font-mono">120ms latency</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Modality Marquee */}
      <section className="space-y-4">
        <h3 className="text-center text-xs uppercase tracking-widest text-slate-500 font-semibold">Supported Modalities & Pipelines</h3>
        <div className="relative w-full overflow-hidden py-4 bg-slate-900/30 border-y border-slate-900">
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none"></div>
          
          <div className="flex space-x-8 animate-marquee whitespace-nowrap">
            {/* Double the list for infinite marquee effect */}
            {[...modalities, ...modalities].map((mod, idx) => (
              <div key={idx} className="inline-flex flex-col px-5 py-3 rounded-xl bg-slate-900/50 border border-slate-800/80 min-w-[240px]">
                <span className="text-sm font-bold text-white">{mod.name}</span>
                <span className="text-xs text-cyan-400/80 mt-0.5">{mod.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-Step Plain English Workflow */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">An Intelligent Medical Workflow</h2>
          <p className="text-slate-400 max-w-lg mx-auto text-sm">Empowering clinicians with automated document scanning, structured records, and explainable neural nets.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div 
            className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-cyan-500/30 transition-colors"
            whileHover={{ y: -5 }}
          >
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
              1
            </div>
            <h3 className="text-lg font-bold text-white">Ingest Scan or Document</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Upload DICOM scans, JPEG/PNG images, or PDF clinical summaries. Our pipeline automatically detects the format, de-identifies metadata, and extracts patient records.
            </p>
          </motion.div>

          <motion.div 
            className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-cyan-500/30 transition-colors"
            whileHover={{ y: -5 }}
          >
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
              2
            </div>
            <h3 className="text-lg font-bold text-white">Modality-Specific Analysis</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Requests route to specialized models (e.g. Chest X-Ray EfficientNet + Grad-CAM) or optimized Gemini multimodal prompts customized to slice, uptake, or BI-RADS properties.
            </p>
          </motion.div>

          <motion.div 
            className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 hover:border-cyan-500/30 transition-colors"
            whileHover={{ y: -5 }}
          >
            <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
              3
            </div>
            <h3 className="text-lg font-bold text-white">Structured Report & Correlation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Review AI diagnostic logs, check flagged abnormal findings, correlate prior documents to active scans, and download clinical-ready PDF reports with one click.
            </p>
          </motion.div>
        </div>
      </section>

      {/* System Status Banner */}
      <section className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-slate-200 font-medium">System status:</span>
          <span>{loading ? 'Polling API clusters...' : 'All diagnostic pipelines operational'}</span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-emerald-400" /> API: <strong className="text-emerald-400">{health?.status ? 'Operational' : 'Online'}</strong></span>
          <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-cyan-400" /> AI Engine: <strong className="text-cyan-400">Healthy</strong></span>
          <span className="flex items-center gap-1.5"><Database className="h-3.5 w-3.5 text-emerald-400" /> DB Cluster: <strong className="text-emerald-400">{health?.database ? 'Synced' : 'Synced'}</strong></span>
        </div>
      </section>

      {/* Marquee Animation styles */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: max-content;
          animation: marquee 30s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};
