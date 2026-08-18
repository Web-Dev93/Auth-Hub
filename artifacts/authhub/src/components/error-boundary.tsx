import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  resetKey?: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: undefined });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
          <div className="border border-destructive/50 bg-destructive/10 p-6 rounded-xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-destructive mb-2 font-mono uppercase">System Fault Detected</h2>
            <p className="text-sm text-muted-foreground mb-4 font-mono">
              {this.state.error?.message || "An unexpected rendering error occurred."}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md font-mono text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              REINITIALIZE MODULE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
