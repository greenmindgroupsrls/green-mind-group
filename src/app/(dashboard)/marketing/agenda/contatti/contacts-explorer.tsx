"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ContactCard } from "./contact-card";
import { CONTACT_STATUSES, CONTACT_STATUS_LABEL, type Contact } from "@/lib/crm";

export function ContactsExplorer({
  contacts,
  members,
}: {
  contacts: Contact[];
  members: { activity_code: number; username: string }[];
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Contact["status"] | "tutti">("tutti");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (statusFilter !== "tutti" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [contacts, query, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per nome, telefono o email"
            className="w-full pl-9 pr-3 h-11 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Contact["status"] | "tutti")}
          className="h-11 rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-white/5 text-gray-900 dark:text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        >
          <option value="tutti">Tutti gli stati</option>
          {CONTACT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CONTACT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-12 text-center">
          <p className="text-gray-400 dark:text-gray-500">
            {contacts.length === 0 ? "Nessun contatto ancora." : "Nessun contatto trovato."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-white/5">
          {filtered.map((c) => (
            <ContactCard key={c.id} contact={c} members={members} />
          ))}
        </div>
      )}
    </div>
  );
}
