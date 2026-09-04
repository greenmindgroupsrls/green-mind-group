import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// In Next.js 16 "Middleware" si chiama Proxy (stessa funzionalita', nuovo nome).
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Supabase non ancora collegato: lascia passare tutto, le pagine mostrano
  // i dati di esempio senza richiedere login (modalita' demo).
  if (!url || !anonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginRoute = pathname.startsWith("/login") || pathname.startsWith("/password-dimenticata");
  // /auth/callback scambia il code OAuth per una sessione: a quel punto la
  // richiesta non ha ancora il cookie di sessione, quindi va lasciata passare.
  const isAuthCallbackRoute = pathname.startsWith("/auth/");
  // /r/<slug> e' il link di invito personale: deve essere raggiungibile da
  // chi non ha ancora un account, esattamente come /login. A differenza di
  // /login pero' NON si reindirizza mai via un utente gia' autenticato:
  // deve poter aprire/condividere/testare il proprio stesso link anche da
  // loggato (la pagina stessa gestisce il caso "hai gia' un account").
  const isReferralLinkRoute = pathname.startsWith("/r/");
  // Termini e Privacy devono essere leggibili sia da chi deve ancora
  // registrarsi (per accettarli) sia da chi e' gia' loggato — a differenza
  // di /login, qui non si reindirizza mai via un utente autenticato.
  const isLegalRoute = pathname.startsWith("/termini") || pathname.startsWith("/privacy");
  // Webhook server-to-server (es. Vortix che manda un nuovo lead): nessuna
  // sessione utente, autenticato via segreto condiviso nel route handler.
  const isWebhookRoute = pathname.startsWith("/api/leads/");
  // Le prenotazioni dal sito Vortix: chi prenota non ha un account, quindi
  // la strada deve restare aperta. La convalida dei dati e il vincolo di
  // unicita' sullo slot stanno nel route handler e nel database.
  // Prenotazioni ed elenchi geografici: entrambe servono al modulo del sito
  // pubblico, dove chi compila non ha un account.
  const isPrenotazioneRoute =
    pathname.startsWith("/api/prenotazioni") || pathname.startsWith("/api/comuni");
  // /company e' il sito prodotto Vortix montato via rewrite (vedi
  // next.config.ts): pagina pubblica, non fa parte del back office, deve
  // restare raggiungibile da chiunque senza login.
  const isCompanyRoute = pathname.startsWith("/company");

  // Lo slash finale e' necessario: la pagina Vortix usa path relativi tipo
  // "css/style.css", che senza "/company/" risolverebbero contro la radice
  // del dominio invece che contro /company/. skipTrailingSlashRedirect in
  // next.config.ts disattiva la normalizzazione automatica di Next (che
  // farebbe l'esatto opposto), quindi va gestito qui a mano.
  if (pathname === "/company") {
    return NextResponse.redirect(new URL("/company/", request.url), 308);
  }

  if (
    !user &&
    !isLoginRoute &&
    !isAuthCallbackRoute &&
    !isReferralLinkRoute &&
    !isLegalRoute &&
    !isWebhookRoute &&
    !isPrenotazioneRoute &&
    !isCompanyRoute
  ) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
