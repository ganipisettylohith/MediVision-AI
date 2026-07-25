import React from 'react';
import { Link } from 'react-router-dom';
import { FileScan, ShieldCheck, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

export const HelpPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">System Documentation & Clinical Guide</h1>
        <p className="text-sm text-slate-400 mt-1">Overview of MediVision AI features, diagnostic capabilities, and clinical decision support workflow.</p>
      </div>

      {/* User Guide Overview */}
      <section className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400 border-b border-slate-800 pb-3">
          <FileScan className="h-5 w-5" />
          <h2 className="font-bold text-lg text-white">How to Use MediVision AI</h2>
        </div>

        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-100 text-base">1. Uploading Medical Scans</h3>
            <p className="text-slate-400">
              Navigate to the <strong>New Scan</strong> tab and upload a supported chest X-ray image (PNG, JPG, or DICOM format, up to 15MB). Optional patient identifiers can be entered to associate scans with clinical records.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-100 text-base">2. Interpreting Visual Heatmaps (Grad-CAM XAI)</h3>
            <p className="text-slate-400">
              The AI engine generates a <strong>Grad-CAM visual heatmap</strong> highlighting the specific anatomical regions of the lung field that influenced the neural network's decision. Use the tab toggle to switch between the Combined View, AI Heatmap, and Original Scan.
            </p>
          </div>

          <div className="space-y-1">
            <h3 className="font-bold text-slate-100 text-base">3. Exporting PDF Reports</h3>
            <p className="text-slate-400">
              Every scan generates a complete medical report synthesized by Gemini LLM. Click <strong>Download PDF</strong> on the analysis or dashboard page to generate a print-ready clinical report.
            </p>
          </div>
        </div>
      </section>

      {/* Scan Modality Framework Roadmap */}
      <section className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-cyan-400 border-b border-slate-800 pb-3">
          <Sparkles className="h-5 w-5" />
          <h2 className="font-bold text-lg text-white">Supported Modalities & Clinical Roadmap</h2>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="block text-sm font-bold text-white">Chest X-Ray (Fully Functional)</span>
              <span className="block text-xs text-slate-300 mt-0.5">
                Supported by trained PyTorch deep learning classification models for pneumonia screening and infiltrates assessment.
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="block text-sm font-bold text-slate-200">Brain MRI, CT Scan & ECG (Coming Soon on Roadmap)</span>
              <span className="block text-xs text-slate-400 mt-0.5">
                Non-X-ray scan types are clearly marked on our clinical roadmap. To ensure complete diagnostic integrity, predictions are disabled for uncalibrated modalities until trained models complete clinical validation.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Button */}
      <div className="pt-2">
        <Link
          to="/analysis"
          className="inline-flex items-center space-x-2 px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20"
        >
          <span>Start New Scan Analysis</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};
