"use client";

import { useState } from "react";
import { LoginForm } from "./login-form";
import { SignupForm } from "./signup-form";
import { GoogleButton } from "@/components/google-button";
import type { Dizionario } from "@/i18n/dizionario";

export function AuthTabs({ next, t }: { next: string; t: Dizionario["accesso"] }) {
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-gray-100 dark:bg-white/5 mb-6">
        <button
          type="button"
          onClick={() => setTab("signin")}
          className={`rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "signin"
              ? "bg-white dark:bg-[#1c1836] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {t.accedi}
        </button>
        <button
          type="button"
          onClick={() => setTab("signup")}
          className={`rounded-md py-2 text-sm font-medium transition-colors ${
            tab === "signup"
              ? "bg-white dark:bg-[#1c1836] text-gray-900 dark:text-white shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {t.registrati}
        </button>
      </div>

      {tab === "signin" ? <LoginForm next={next} t={t} /> : <SignupForm t={t} />}

      <div className="flex items-center gap-3 my-5">
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        <span className="text-xs text-gray-400 dark:text-gray-500">{t.oppure}</span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
      </div>

      <GoogleButton label={tab === "signin" ? t.accediConGoogle : t.registratiConGoogle} />
    </div>
  );
}
