import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Last-resort boundary so a rendering bug shows a message instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error', error, info.componentStack);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-lg font-semibold text-ink-1">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-2">The page hit an unexpected error. Reloading usually fixes it.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-md border border-line px-3 py-1.5 text-sm text-ink-1">
          Reload
        </button>
      </div>
    );
  }
}
