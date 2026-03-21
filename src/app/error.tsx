'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black font-sans text-zinc-900 dark:text-zinc-100">
      <div className="text-center space-y-6 px-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium uppercase tracking-wide">
          Error
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
