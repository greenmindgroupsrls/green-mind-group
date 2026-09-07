import { ResetPasswordForm } from "./reset-password-form";
import { MarchioCompleto } from "@/components/marchio";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <MarchioCompleto className="h-auto w-[190px]" priority />
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
