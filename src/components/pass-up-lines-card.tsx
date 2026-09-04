"use client";

import { useMemo } from "react";
import { ArrowUpRight, Users } from "lucide-react";
import type { Member } from "@/lib/members";
import { formatActivityCode } from "@/lib/activity-code";
import { RANK_LABEL, type Rank } from "@/lib/rank";

// Le due facce del pass-up, viste da chi guarda:
//   cedute      = persone che ho iscritto io ma che sono finite sotto il VIP
//                 sopra di me (le vendite di qualifica)
//   di proprieta = chi e' agganciato sotto di me nella struttura, compresi
//                 quelli arrivati per eredita' dai pass-up altrui
// Si ricavano dal confronto fra chi ha iscritto (ref_sponsor_code) e dove la
// persona sta davvero (parent_code): quando i due divergono, c'e' stata una
// cessione.
export function PassUpLinesCard({
  members,
  ranks,
  rootCode,
}: {
  members: Member[];
  ranks: Record<number, Rank>;
  rootCode: number;
}) {
  const { cedute, proprie } = useMemo(() => {
    const cedute = members.filter(
      (m) => m.ref_sponsor_code === rootCode && m.parent_code !== rootCode,
    );
    const proprie = members.filter((m) => m.parent_code === rootCode);
    return { cedute, proprie };
  }, [members, rootCode]);

  const byCode = useMemo(
    () => new Map(members.map((m) => [m.activity_code, m])),
    [members],
  );

  if (cedute.length === 0 && proprie.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white">Le tue linee</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Chi hai ceduto per qualificarti e chi è rimasto tuo
      </p>

      {cedute.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <ArrowUpRight size={13} />
            Cedute per la qualifica ({cedute.length})
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {cedute.map((m) => {
              const destinatario = m.parent_code !== null ? byCode.get(m.parent_code) : undefined;
              return (
                <li
                  key={m.activity_code}
                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-300 truncate">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1.5 tabular-nums">
                      {formatActivityCode(m.activity_code)}
                    </span>
                    {m.username}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    → {destinatario?.username ?? "azienda"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {proprie.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <Users size={13} />
            Nella tua struttura ({proprie.length})
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {proprie.map((m) => {
              const ereditato = m.ref_sponsor_code !== null && m.ref_sponsor_code !== rootCode;
              return (
                <li
                  key={m.activity_code}
                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-white/5 px-3 py-2 text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-300 truncate">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1.5 tabular-nums">
                      {formatActivityCode(m.activity_code)}
                    </span>
                    {m.username}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {ereditato && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">ereditato</span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {RANK_LABEL[ranks[m.activity_code] ?? "standard"]}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
