import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getAuthState } from "@/lib/current-member";
import { createClient } from "@/lib/supabase/server";
import { CompleteForm } from "./complete-form";

function firstOf(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim() !== "") return v;
  }
  return "";
}

export default async function CompletaRegistrazionePage() {
  const { isAuthenticated, member } = await getAuthState();

  if (!isAuthenticated) redirect("/login");
  if (member) redirect("/");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;

  const fullNameFallback = typeof meta.full_name === "string" ? meta.full_name : "";
  const [fullFirst, ...fullRest] = fullNameFallback.split(" ");

  const initialFirstName = firstOf(meta.first_name, meta.given_name, fullFirst);
  const initialLastName = firstOf(meta.last_name, meta.family_name, fullRest.join(" "));
  const initialRefCode =
    typeof meta.ref_code === "number"
      ? meta.ref_code
      : typeof meta.ref_code === "string" && meta.ref_code !== ""
        ? Number(meta.ref_code)
        : null;
  const initialAutoAssign = meta.auto_assign === true;
  const initialRole = meta.role === "incaricato" ? "incaricato" : "cliente";
  const initialAccountType = meta.account_type === "company" ? "company" : "individual";
  const initialTaxId = typeof meta.tax_id === "string" ? meta.tax_id : "";
  const initialCompanyName = typeof meta.company_name === "string" ? meta.company_name : "";

  const cookieStore = await cookies();
  const pendingRef = cookieStore.get("pending_ref")?.value;
  const pendingRefName = cookieStore.get("pending_ref_name")?.value;
  const lockedRef =
    pendingRef && Number.isInteger(Number(pendingRef))
      ? { code: Number(pendingRef), username: pendingRefName ?? `#${pendingRef}` }
      : null;

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
            Completa la registrazione
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Ultimo passo: conferma i tuoi dati e indica chi ti ha invitato nella rete.
          </p>
          <CompleteForm
            initialFirstName={initialFirstName}
            initialLastName={initialLastName}
            initialRefCode={initialRefCode}
            initialAutoAssign={initialAutoAssign}
            initialRole={initialRole}
            initialAccountType={initialAccountType}
            initialTaxId={initialTaxId}
            initialCompanyName={initialCompanyName}
            lockedRef={lockedRef}
          />
        </div>
      </div>
    </div>
  );
}
