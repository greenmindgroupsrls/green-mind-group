import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent)] flex items-center justify-center text-[var(--accent-fg)] font-bold">
            G
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-white">
            Green Mind Group
          </span>
        </div>

        <div className="glass-card p-6">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Imposta una nuova password
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Scegli la nuova password per il tuo account.
          </p>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
