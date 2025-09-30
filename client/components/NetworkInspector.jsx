import { useEffect, useState } from "react";

export default function NetworkInspector() {
  const [clerkNetworkError, setClerkNetworkError] = useState(null);
  const [lastUrl, setLastUrl] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Avoid double-wrapping in dev or HMR
    if (window.fetch && window.fetch.__wrappedByNetworkInspector) return;

    // Bind original fetch to window to avoid 'Illegal invocation' on some browsers
    const originalFetch = window.fetch.bind(window);

    const getUrlString = (arg) => {
      try {
        if (!arg) return "";
        if (typeof arg === "string") return arg;
        if (typeof Request !== "undefined" && arg instanceof Request) return arg.url || "";
        if (typeof URL !== "undefined" && arg instanceof URL) return String(arg);
        return JSON.stringify(arg);
      } catch {
        return "";
      }
    };

    const handleError = (args, err) => {
      try {
        const url = getUrlString(args && args[0]);
        setLastUrl(url);
        if (typeof url === "string" && url.toLowerCase().includes("clerk")) {
          const message = err?.message || String(err);
          const stack = err?.stack || null;
          const full = stack ? `${message}\n\n${stack}` : message;
          console.error("NetworkInspector detected Clerk fetch error:", { url, err });
          setClerkNetworkError(full);
        }
      } catch (e) {
        console.error("NetworkInspector capture error", e);
      }
    };

    const wrappedFetch = async (...args) => {
      // determine URL string synchronously first
      const urlStr = getUrlString(args && args[0]);
      // Only instrument Clerk-related requests to avoid interfering with other third-party scripts
      if (!urlStr || !urlStr.toLowerCase().includes("clerk")) {
        // Fast path: just call original fetch without extra error handling
        return await originalFetch(...args);
      }

      try {
        return await originalFetch(...args);
      } catch (err) {
        handleError(args, err);
        throw err;
      }
    };

    // Mark wrapper for idempotency
    Object.defineProperty(wrappedFetch, "__wrappedByNetworkInspector", { value: true });

    window.fetch = wrappedFetch;

    return () => {
      // Restore only if our wrapper is still installed
      if (window.fetch && window.fetch.__wrappedByNetworkInspector) {
        // @ts-ignore
        window.fetch = originalFetch;
      }
    };
  }, []);

  if (!clerkNetworkError) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-3xl w-full px-4">
      <div className="rounded-md border bg-red-50 p-3 text-sm text-red-800 shadow">
        <strong>Network error contacting Clerk</strong>
        {lastUrl && (
          <div className="mt-1 break-words text-xs">
            Request URL: <code className="text-xs">{lastUrl}</code>
          </div>
        )}
        <div className="mt-2 text-xs whitespace-pre-wrap">{clerkNetworkError}</div>
        <div className="mt-2 text-xs text-muted-foreground">
          Common causes: invalid publishable key, Clerk dashboard origin not allowed, adblocker or network blocking Clerk.
        </div>
      </div>
    </div>
  );
}
