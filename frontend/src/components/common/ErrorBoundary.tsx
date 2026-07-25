import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React UI error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-amber-500/30 bg-slate-950/90 text-center space-y-5 shadow-2xl">
            <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Something Went Wrong</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                The application encountered an unexpected display error, but caught it safely without collapsing your session.
              </p>
            </div>
            {this.state.error?.message && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 truncate">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reload Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
