"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-page p-6 text-center text-sam-text-1">
      <div className="flex max-w-md flex-col items-center justify-center rounded-[2rem] border border-sam-border bg-sam-surface p-8 shadow-xl">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-sam-text-1">
          Something went wrong
        </h2>
        <p className="mt-2 text-xs leading-5 text-sam-text-3">
          {error.message || "An unexpected error occurred. Please try reloading the page."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-sam-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sam-primary/90 active:scale-95"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}
