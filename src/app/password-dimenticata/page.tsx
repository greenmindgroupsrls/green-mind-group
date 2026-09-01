import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function PasswordDimenticataPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold">
            G
          </div>
          <span className="font-semibold text-lg text-gray-900 dark:text-white">
            Green Mind Group
          </span>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Password dimenticata
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Inserisci la tua email: se corrisponde a un account esistente, ti mandiamo un link
            per reimpostare la password.
          </p>
          <ForgotPasswordForm />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6 text-center">
            <Link href="/login" className="text-accent hover:underline">
              Torna al login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
