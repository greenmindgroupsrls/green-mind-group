import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/current-member";
import { formatActivityCode } from "@/lib/activity-code";
import { buildContractPdf, type ContractData } from "@/lib/contract-pdf";

const DATE_FMT: Intl.DateTimeFormatOptions = { day: "2-digit", month: "long", year: "numeric" };

function itDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("it-IT", DATE_FMT);
  } catch {
    return String(iso);
  }
}

function itDateTime(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("it-IT", { ...DATE_FMT, hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(iso);
  }
}

// Il testo integrale del contratto e' il PDF caricato dall'azienda in
// Marketing > Documenti: viene accodato alla pagina dei dati, cosi' il
// documento generato contiene esattamente le clausole approvate.
async function loadOriginalContract(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Uint8Array | null> {
  const { data } = await supabase
    .from("marketing_documents")
    .select("file_url")
    .eq("doc_type", "contratto_incaricato")
    .maybeSingle();
  if (!data?.file_url) return null;
  try {
    const res = await fetch(data.file_url);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  } catch {
    return null;
  }
}

type Ctx = {
  member: NonNullable<Awaited<ReturnType<typeof getCurrentMember>>>;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

async function baseData({ member, supabase }: Ctx) {
  const [{ data: row }, { data: profile }, { data: address }] = await Promise.all([
    supabase
      .from("members")
      .select("first_name, last_name, email, ref_sponsor_code")
      .eq("activity_code", member.activity_code)
      .single(),
    supabase
      .from("member_profiles")
      .select("date_of_birth, phone_country_code, phone_number, tax_id, company_name")
      .eq("activity_code", member.activity_code)
      .maybeSingle(),
    supabase
      .from("member_addresses")
      .select("street, city, postal_code, region, country")
      .eq("activity_code", member.activity_code)
      .limit(1)
      .maybeSingle(),
  ]);

  let sponsor = "";
  if (row?.ref_sponsor_code !== null && row?.ref_sponsor_code !== undefined) {
    const { data: s } = await supabase
      .from("members")
      .select("username")
      .eq("activity_code", row.ref_sponsor_code)
      .maybeSingle();
    sponsor = s?.username
      ? `${formatActivityCode(row.ref_sponsor_code)} ${s.username}`
      : formatActivityCode(row.ref_sponsor_code);
  }

  const first = row?.first_name ?? "";
  const last = row?.last_name ?? "";

  return {
    activityCode: formatActivityCode(member.activity_code),
    firstName: first,
    lastName: last,
    fullName: `${first} ${last}`.trim() || member.username,
    email: row?.email ?? "",
    phone: [profile?.phone_country_code, profile?.phone_number].filter(Boolean).join(" "),
    taxId: profile?.tax_id ?? "",
    companyName: profile?.company_name ?? null,
    address: address
      ? [address.street, address.postal_code, address.city, address.region, address.country]
          .filter(Boolean)
          .join(", ")
      : "",
    birthDate: itDate(profile?.date_of_birth),
    sponsor,
  };
}

// POST = anteprima con i dati del form, marcata come bozza non firmata.
export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Devi essere autenticato" }, { status: 401 });
  }

  const supabase = await createClient();
  const form = await request.formData();
  const t = (k: string) => String(form.get(k) ?? "").trim();
  const yes = (k: string) => form.get(k) === "si";

  const base = await baseData({ member, supabase });
  const data: ContractData = {
    ...base,
    birthPlace: t("birth_place"),
    birthProvince: t("birth_province"),
    citizenship: t("citizenship"),
    profession: t("profession"),
    documentType: t("document_type"),
    documentNumber: t("document_number"),
    bankName: t("bank_name"),
    bankHolder: t("bank_holder"),
    iban: t("iban"),
    swift: t("swift"),
    declEarnedThreshold: yes("decl_earned_threshold"),
    declEmploymentStatus: t("decl_employment_status"),
    declHasVat: yes("decl_has_vat"),
    declVatNumber: t("decl_vat_number"),
    declVatRegime: t("decl_vat_regime"),
    declPublicEmployee: yes("decl_public_employee"),
    declPublicFullTime: form.get("decl_public_full_time") === null ? null : yes("decl_public_full_time"),
    signingPlace: t("signing_place"),
    contractVersion: t("contract_version"),
    signedAt: null,
    signedIp: null,
  };

  const bytes = await buildContractPdf(data, await loadOriginalContract(supabase));
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="contratto-incaricato-anteprima.pdf"',
    },
  });
}

// GET = contratto definitivo gia' firmato, ricostruito dai dati registrati.
export async function GET() {
  const member = await getCurrentMember();
  if (!member) {
    return NextResponse.json({ error: "Devi essere autenticato" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from("incaricato_contracts")
    .select("*")
    .eq("activity_code", member.activity_code)
    .maybeSingle();

  if (!contract) {
    return NextResponse.json({ error: "Nessun contratto firmato trovato" }, { status: 404 });
  }

  const base = await baseData({ member, supabase });
  const data: ContractData = {
    ...base,
    birthPlace: contract.birth_place ?? "",
    birthProvince: contract.birth_province ?? "",
    citizenship: contract.citizenship ?? "",
    profession: contract.profession ?? "",
    documentType: contract.document_type ?? "",
    documentNumber: contract.document_number ?? "",
    bankName: contract.bank_name ?? "",
    bankHolder: contract.bank_holder ?? "",
    iban: contract.iban ?? "",
    swift: contract.swift ?? "",
    declEarnedThreshold: contract.decl_earned_threshold,
    declEmploymentStatus: contract.decl_employment_status ?? "",
    declHasVat: contract.decl_has_vat,
    declVatNumber: contract.decl_vat_number ?? "",
    declVatRegime: contract.decl_vat_regime ?? "",
    declPublicEmployee: contract.decl_public_employee,
    declPublicFullTime: contract.decl_public_full_time,
    signingPlace: contract.signing_place ?? "",
    contractVersion: contract.contract_version ?? "",
    signedAt: itDateTime(contract.signed_at),
    signedIp: contract.signed_ip ?? null,
  };

  const bytes = await buildContractPdf(data, await loadOriginalContract(supabase));
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="contratto-incaricato-firmato.pdf"',
    },
  });
}
