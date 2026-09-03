"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { COOKIE_LINGUA, isLingua } from "@/i18n/config";

// La lingua sta in un cookie e non nell'indirizzo: il back office e' dietro
// autenticazione, non deve essere indicizzato, e mettere /en davanti a ogni
// pagina avrebbe voluto dire riscrivere tutti i collegamenti interni per un
// vantaggio che qui non esiste.
export async function cambiaLingua(lingua: string) {
  if (!isLingua(lingua)) return;

  (await cookies()).set(COOKIE_LINGUA, lingua, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
}
