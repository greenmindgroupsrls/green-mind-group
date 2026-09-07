import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";
import { MarchioCompleto } from "@/components/marchio";

export default function PasswordDimenticataPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <MarchioCompleto className="h-auto w-[190px]" priority />
        </div>

        <div className="glass-card p-6">
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
