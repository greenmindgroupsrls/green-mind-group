import { SupportForm } from "../support-form";

export default function SupportTicketPage() {
  return (
    <div className="max-w-2xl rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Apri un ticket di assistenza, ti risponderemo entro 24 ore.
      </p>
      <SupportForm />
    </div>
  );
}
