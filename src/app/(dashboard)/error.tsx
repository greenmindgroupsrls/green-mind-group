"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="p-8 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
        <AlertTriangle size={22} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        Qualcosa è andato storto
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Si è verificato un errore imprevisto durante il caricamento di questa pagina. Riprova, oppure
        torna più tardi.
      </p>
      <button
        type="button"
        onClick={reset}
        className="glass-btn-primary rounded-lg px-4 py-2.5 text-sm font-medium"
      >
        Riprova
      </button>
    </div>
  );
}
