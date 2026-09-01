import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const ref = request.nextUrl.searchParams.get("ref");
  const refName = request.nextUrl.searchParams.get("refName");
  const nextParam = request.nextUrl.searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const response = NextResponse.redirect(new URL(next, request.url));

  // Il codice ref del link di invito (gmg.app/<slug>) sopravvive al round-trip
  // OAuth solo così: /registrati/completa li legge per bloccare il campo ref
  // di chi arriva da un link di invito e si registra con Google.
  if (ref) {
    const cookieOptions = { maxAge: 600, httpOnly: true, sameSite: "lax" as const, path: "/" };
    response.cookies.set("pending_ref", ref, cookieOptions);
    if (refName) response.cookies.set("pending_ref_name", refName, cookieOptions);
  }

  return response;
}
