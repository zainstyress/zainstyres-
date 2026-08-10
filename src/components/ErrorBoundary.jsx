import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Application error boundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
          <div className="max-w-md rounded-[32px] border border-white/10 bg-white/[0.04] p-8">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-rose-400">Something went wrong</p>
            <h1 className="mt-4 text-3xl font-black">The app hit an unexpected error.</h1>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-black"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}