import { MarchioCompleto } from "@/components/marchio";
import { DOCUMENTO_LABEL } from "@/lib/documenti";
import { apriCollegamento } from "./actions";
import { FirmaRemota } from "./firma-remota";

// LA PAGINA PUBBLICA DI FIRMA
//
// Chi arriva qui non ha un account: e' il cliente che ha ricevuto il link.
// Quindi niente sessione, niente menu del back office, e le letture passano
// dalla service role key (vedi actions.ts). La pagina mostra solo cosa si
// sta firmando e a chi: nessun dato in piu' di quelli che il cliente ha
// gia' dato di persona.

export const dynamic = "force-dynamic";

// L'indirizzo si mostra a meta': serve a far riconoscere la propria casella
// senza scriverla per intero su una pagina raggiungibile con un link.
function offusca(email: string): string {
  const [nome, dominio] = email.split("@");
  if (!dominio) return email;
  const visibile = nome.slice(0, 2);
  return `${visibile}${"•".repeat(Math.max(nome.length - 2, 1))}@${dominio}`;
}

function Guscio({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-10 flex justify-center">
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="flex justify-center">
          <MarchioCompleto className="h-12 w-auto" />
        </div>
        {children}
      </div>
    </div>
  );
}

function Avviso({ testo }: { testo: string }) {
  return (
    <Guscio>
      <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Firma non disponibile</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{testo}</p>
      </div>
    </Guscio>
  );
}

export default async function FirmaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const esito = await apriCollegamento(token);
  if (esito.errore || !esito.documento) {
    return <Avviso testo={esito.errore ?? "Link non valido"} />;
  }

  const { documento } = esito;
  const etichetta = DOCUMENTO_LABEL[documento.tipo];

  return (
    <Guscio>
      <div className="rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-sm flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">Green Mind Group</p>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{etichetta}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Documento n. {documento.numero}, intestato a {documento.clienteNome}.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Firmando qui apponi una firma elettronica semplice: verranno registrati data, ora e
          indirizzo di rete. Riceverai la copia firmata via email.
        </p>
      </div>

      <FirmaRemota
        token={token}
        documento={etichetta}
        numero={documento.numero}
        nomeSuggerito={documento.clienteNome}
        emailOffuscata={offusca(esito.email)}
      />
    </Guscio>
  );
}
