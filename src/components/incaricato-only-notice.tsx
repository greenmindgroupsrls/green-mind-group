import Link from "next/link";

// Mostrata al posto del contenuto quando un cliente prova a raggiungere via
// URL diretto una sezione riservata agli incaricati (non basta nascondere
// la voce di menu — la route va comunque protetta).
export function IncaricatoOnlyNotice() {
  return (
    <p className="rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-400 text-sm px-4 py-2">
      Questa sezione è riservata agli incaricati.{" "}
      <Link href="/diventa-incaricato" className="underline font-medium">
        Diventa distributore
      </Link>{" "}
      per sbloccarla.
    </p>
  );
}
