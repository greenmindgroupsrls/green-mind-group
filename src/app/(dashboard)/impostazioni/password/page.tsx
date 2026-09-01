import { PasswordForm } from "./password-form";

export default function PasswordPage() {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Cambia password</h2>
      <PasswordForm />
    </div>
  );
}
