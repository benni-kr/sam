"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function CrosstablesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[CrosstablesError] Route error caught:", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center rounded-[2rem] border border-sam-border bg-sam-surface p-8 text-center shadow-xl backdrop-blur">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-400">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-base font-semibold text-sam-text-1">
        Matrix View Error
      </h2>
      <p className="mt-1 max-w-md text-xs text-sam-text-3">
        {error.message || "An unexpected error occurred while displaying the matrix view."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-sam-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sam-primary/90 active:scale-95"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Reload Matrix
      </button>
    </div>
  );
}
