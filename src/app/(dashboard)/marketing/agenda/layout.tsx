import { AgendaSubNav } from "./agenda-sub-nav";

// Condiviso da /marketing/agenda e /marketing/agenda/contatti: la
// sotto-navigazione qui rende esplicito che Contatti e' una vista della
// stessa sezione Agenda, non una pagina indipendente (prima appariva come
// scheda separata alla pari nel menu principale, fonte di confusione dato
// che le due pagine condividono gli stessi dati e si scrivono a vicenda).
export default function AgendaLayout({ children }: LayoutProps<"/marketing/agenda">) {
  return (
    <div className="flex flex-col gap-6">
      <AgendaSubNav />
      {children}
    </div>
  );
}
