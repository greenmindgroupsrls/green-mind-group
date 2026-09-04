"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { AlertTriangle } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
          <AlertTriangle size={22} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Qualcosa è andato storto
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Si è verificato un errore imprevisto. Riprova, oppure torna più tardi.
        </p>
        <button
          type="button"
          onClick={reset}
          className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium"
        >
          Riprova
        </button>
      </div>
    </div>
  );
}
