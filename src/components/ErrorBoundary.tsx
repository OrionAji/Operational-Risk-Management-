import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  isPermissionError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '', isPermissionError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let message = error.message || 'An unexpected error occurred.';
    let isPermissionError = false;
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        message = parsed.error;
        isPermissionError =
          message.toLowerCase().includes('permission') ||
          message.toLowerCase().includes('insufficient');
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, errorMessage: message, isPermissionError };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F4F5F7] dark:bg-[#0B1120] flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-[#C62828] dark:text-[#F87171] mb-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h1 className="font-display text-2xl font-bold tracking-tight">
                {this.state.isPermissionError ? 'Access Restricted' : 'Application Error'}
              </h1>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
              {this.state.isPermissionError
                ? 'Your account does not have security clearance for this database operation. If your pilot registration is still pending, wait for an Admin to verify your account.'
                : this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 w-full min-h-[44px] px-4 py-2.5 rounded-lg bg-[#0F172A] dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-semibold hover:bg-slate-800 dark:hover:bg-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload 407 ACTG ORM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
