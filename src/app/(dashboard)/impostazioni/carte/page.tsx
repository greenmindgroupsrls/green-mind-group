import { CreditCard } from "lucide-react";

export default function SavedCardsPage() {
  return (
    <div className="glass-card p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Saved Cards</h2>
      <div className="flex flex-col items-center justify-center text-center py-12 text-gray-500 dark:text-gray-400">
        <CreditCard size={32} className="mb-3" />
        <p className="text-sm">In arrivo con lo shop e i pagamenti.</p>
      </div>
    </div>
  );
}
