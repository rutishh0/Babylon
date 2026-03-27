'use client';

import { useEffect } from 'react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <svg
        className="text-accent mb-4 opacity-60"
        width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h2 className="text-white text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-[#a0a0a0] text-sm mb-6 max-w-sm">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="bg-accent hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-full transition-colors text-sm"
      >
        Try again
      </button>
    </div>
  );
}
