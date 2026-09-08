import { PasswordForm } from "./password-form";

export default function PasswordPage() {
  return (
    <div className="glass-card p-4 sm:p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Cambia password</h2>
      <PasswordForm />
    </div>
  );
}
