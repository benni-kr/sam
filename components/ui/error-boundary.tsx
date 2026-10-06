"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}] Uncaught error:`,
      error,
      errorInfo,
    );
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-full min-h-[300px] w-full flex-col items-center justify-center rounded-[2rem] border border-sam-border bg-sam-surface p-8 text-center shadow-xl backdrop-blur">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
            <AlertTriangle className="h-7 w-7" aria-hidden="true" />
          </div>
          <h2 className="text-base font-semibold text-sam-text-1">
            {this.props.name ? `${this.props.name} encountered an error` : "Something went wrong"}
          </h2>
          <p className="mt-1 max-w-md text-xs text-sam-text-3">
            {this.state.error?.message || "An unexpected error occurred during rendering."}
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sam-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sam-primary/90 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
