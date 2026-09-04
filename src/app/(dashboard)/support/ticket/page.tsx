import { SupportForm } from "../support-form";

export default function SupportTicketPage() {
  return (
    <div className="max-w-2xl glass-card p-6">
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Apri un ticket di assistenza, ti risponderemo entro 24 ore.
      </p>
      <SupportForm />
    </div>
  );
}
