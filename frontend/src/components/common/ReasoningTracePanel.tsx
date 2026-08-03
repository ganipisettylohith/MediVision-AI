import React, { useState, useEffect } from 'react';
import { ShieldAlert, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '../../services/api';

interface ReasoningTracePanelProps {
  scanId: number;
}

interface TraceData {
  prompt_text: string;
  model_name: string;
  model_version: string;
  gradcam_parameters_json: string;
  request_id: string;
}

export const ReasoningTracePanel: React.FC<ReasoningTracePanelProps> = ({ scanId }) => {
  const [trace, setTrace] = useState<TraceData | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (expanded && !trace) {
      setLoading(true);
      setError(false);
      apiClient.get<TraceData>(`/analysis/${scanId}/trace`)
        .then(res => setTrace(res.data))
        .catch(err => {
          console.error(err);
          setError(true);
        })
        .finally(() => setLoading(false));
    }
  }, [expanded, scanId, trace]);

  return (
    <div className="bg-slate-950/40 rounded-xl border border-red-500/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-900 transition-colors"
      >
        <div className="flex items-center space-x-2 text-red-400">
          <ShieldAlert className="h-4 w-4" />
          <span className="font-bold text-xs uppercase tracking-wider">Clinician Transparency Audit Trace</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-900 pt-4 space-y-4 text-xs">
          {loading ? (
            <div className="text-slate-500 flex items-center gap-1">
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-t border-red-400 border-r" />
              Loading audit trace from secure logs...
            </div>
          ) : error ? (
            <div className="text-red-400">Trace log retrieval unauthorized or unavailable.</div>
          ) : trace ? (
            <div className="space-y-3 font-mono text-slate-350">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-850">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Model Engine</span>
                  <span className="text-white">{trace.model_name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Version</span>
                  <span className="text-white">{trace.model_version}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Grad-CAM Hook</span>
                  <span className="text-white">{trace.gradcam_parameters_json}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block font-bold">Request ID</span>
                  <span className="text-white truncate block">{trace.request_id}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] text-slate-500 uppercase block font-bold flex items-center gap-1">
                  <Terminal className="h-3 w-3 text-red-400" />
                  Exact Synthesis Prompt Sent to LLM
                </span>
                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-900 overflow-x-auto text-[10px] leading-relaxed text-slate-400 whitespace-pre-wrap">
                  {trace.prompt_text}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
