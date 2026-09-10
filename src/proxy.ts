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
  // /api/coupon genera il buono di fine sondaggio: stessa ragione, chi
  // risponde al sondaggio non ha ancora un account.
  const isPrenotazioneRoute =
    pathname.startsWith("/api/prenotazioni") ||
    pathname.startsWith("/api/comuni") ||
    pathname.startsWith("/api/coupon");
  // Il sito VORTIX e' il sito principale e vive alla radice del dominio:
  // e' la prima cosa che vede chi arriva, quindi non puo' passare da una
  // richiesta di accesso. Elenco esplicito e non un prefisso, cosi' una
  // pagina nuova del back office non diventa pubblica per sbaglio.
  const PAGINE_PUBBLICHE = new Set([
    "/",
    "/sondaggio",
    "/disclaimer",
    "/termini-greenmindgroup",
    "/privacy-greenmindgroup",
  ]);
  const isSitoPubblico = PAGINE_PUBBLICHE.has(pathname);
  // Il marchio serve alla pagina di accesso, cioe' a chi non ha ancora
  // fatto l'accesso: mandarlo al login e' un giro a vuoto che finisce con
  // un'immagine rotta proprio sulla prima schermata che si vede.
  const isMarchioRoute = pathname.startsWith("/marchio/");

  if (
    !user &&
    !isLoginRoute &&
    !isAuthCallbackRoute &&
    !isReferralLinkRoute &&
    !isLegalRoute &&
    !isWebhookRoute &&
    !isPrenotazioneRoute &&
    !isSitoPubblico &&
    !isMarchioRoute
  ) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  // apple-icon.png sta accanto a favicon.ico: e' l'icona che iOS e Android
  // usano quando si aggiunge il sito alla schermata iniziale, e la chiedono
  // senza avere una sessione. Passando dal guscio di autenticazione veniva
  // rimandata al login, e l'icona restava vuota.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|robots.txt|sitemap.xml|css/|js/|assets/|.*\\.svg$).*)",
  ],
};
