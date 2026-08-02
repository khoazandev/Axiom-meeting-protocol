'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Global Error Boundary for the application.
 *
 * Catches unhandled React errors and displays a user-friendly error UI
 * with a retry button instead of crashing the entire app.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Future: Send to error tracking service (Sentry, etc.)
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Something went wrong
              </h1>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                An unexpected error occurred. This has been logged for investigation.
                Please try again.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-xl text-left">
                <p className="text-xs font-mono text-destructive/80 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <Button
              onClick={this.handleRetry}
              className="rounded-full px-6 bg-accent text-accent-foreground hover:bg-accent/90 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
