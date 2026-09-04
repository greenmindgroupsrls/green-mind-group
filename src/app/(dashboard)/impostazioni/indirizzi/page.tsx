import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddressForm } from "./address-form";
import { DeleteAddressButton } from "./delete-address-button";

const TYPE_LABEL: Record<string, string> = { shipping: "Shipping", billing: "Billing" };

export default async function SavedAddressesPage() {
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

  const { data: addresses } = await supabase
    .from("member_addresses")
    .select("*")
    .eq("activity_code", member.activity_code)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="glass-card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Address Information</h2>

        {addresses && addresses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {addresses.map((a) => (
              <div
                key={a.id}
                className="rounded-lg border border-gray-200 dark:border-white/10 p-4 flex flex-col gap-2"
              >
                <p className="font-medium text-gray-900 dark:text-white">{a.recipient_name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {a.street}
                  <br />
                  {a.city}
                  {a.region ? `, ${a.region}` : ""}, {a.country} - {a.postal_code}
                  {a.phone && (
                    <>
                      <br />
                      Phone: {a.phone}
                    </>
                  )}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <DeleteAddressButton id={a.id} />
                  <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400">
                    {TYPE_LABEL[a.type] ?? a.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Nessun indirizzo salvato.</p>
        )}
      </div>

      <div className="glass-card p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Aggiungi indirizzo</h2>
        <AddressForm />
      </div>
    </div>
  );
}
