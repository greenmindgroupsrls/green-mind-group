"use client";

import { X } from "lucide-react";

export function SlidePanel({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg h-full overflow-y-auto bg-white dark:bg-[#151129] shadow-xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-[#151129] z-10">
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Chiudi"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}
