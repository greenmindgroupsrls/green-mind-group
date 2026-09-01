import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { KycUploadField } from "@/components/kyc-upload-field";

const DOC_TYPES = [
  { type: "id_proof" as const, label: "ID Proof" },
  { type: "utility_bill" as const, label: "Utility Bills" },
  { type: "account_statement" as const, label: "Account statement" },
];

export default async function KycDocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase
    .from("members")
    .select("activity_code")
    .eq("auth_user_id", user.id)
    .single();

  if (!member) redirect("/registrati/completa");

  const { data: docs } = await supabase
    .from("member_kyc_documents")
    .select("doc_type")
    .eq("activity_code", member.activity_code);

  const uploadedTypes = new Set((docs ?? []).map((d) => d.doc_type));

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">KYC Documents</h2>
      <div className="flex flex-col gap-5 max-w-lg">
        {DOC_TYPES.map(({ type, label }) => (
          <KycUploadField
            key={type}
            docType={type}
            label={label}
            activityCode={member.activity_code}
            uploaded={uploadedTypes.has(type)}
          />
        ))}
      </div>
    </div>
  );
}
