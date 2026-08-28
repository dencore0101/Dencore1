import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { logError } from '@/lib/errorLogger';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logError({
      module: 'ErrorBoundary',
      operation: 'component_crash',
      message: error.message,
      severity: 'critical',
      details: { componentStack: info.componentStack?.split('\n').slice(0, 10).join('\n') },
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
          <div className="max-w-md w-full text-center">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-error-50 text-error-600 mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-lg font-semibold text-neutral-900 mb-1">Something went wrong</h1>
            <p className="text-sm text-neutral-500 mb-6">
              An unexpected error occurred while loading this page. Try reloading.
            </p>
            <button onClick={this.handleReload} className="btn-primary">
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
