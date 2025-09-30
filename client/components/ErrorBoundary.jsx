import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log the error to console; in production, send to monitoring (Sentry) if connected
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      const message = this.state.error?.message || String(this.state.error);
      return (
        <div className="min-h-[60vh] container mx-auto px-4 py-10 grid place-items-center">
          <div className="rounded-2xl border bg-card p-6 shadow-sm max-w-xl text-left">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-muted-foreground">An unexpected error occurred while loading authentication. Details:</p>
            <pre className="mt-3 p-3 rounded bg-muted text-sm overflow-auto">{message}</pre>
            <div className="mt-4 space-y-2">
              <p className="text-sm">Possible causes and next steps:</p>
              <ul className="list-disc list-inside text-sm">
                <li>Make sure VITE_CLERK_PUBLISHABLE_KEY is set correctly in your client environment.</li>
                <li>Check Clerk dashboard to ensure your application origin is allowed in the list of allowed origins.</li>
                <li>Ensure your browser or environment can reach Clerk services (no network blocking or restrictive ad blockers).</li>
                <li>If you want to bypass authentication temporarily, set VITE_STATIC_DEMO=true in your environment (not recommended for production).</li>
              </ul>
              <div className="mt-3 flex gap-2">
                <a href="/" className="inline-flex items-center px-3 py-2 rounded bg-gray-100 text-sm">Back to home</a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
