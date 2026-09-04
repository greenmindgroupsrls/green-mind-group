"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Search, ShieldAlert, Users, Package, Euro, Wand2, Ban, ShieldCheck } from "lucide-react";
import { formatActivityCode } from "@/lib/activity-code";
import { RANK_LABEL, type Rank } from "@/lib/rank";
import type { MemberRole } from "@/lib/current-member";
import {
  updateMemberProfile,
  setMemberRankOverride,
  suspendMember,
  unsuspendMember,
  type ProfileState,
} from "./actions";

export type ControlCenterMember = {
  activity_code: number;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: MemberRole;
  created_at: string;
  sponsorCode: number | null;
  sponsorName: string | null;
  rank: Rank;
  rankOverride: Rank | null;
  teamSize: number;
  totalEarnings: number;
  piecesSold: number;
  accountType: string;
  phoneCountryCode: string | null;
  phoneNumber: string | null;
  taxId: string | null;
  companyName: string | null;
  suspended: boolean;
  suspendedReason: string | null;
};

const RANK_BADGE_CLASS: Record<Rank, string> = {
  standard: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  vip: "bg-accent/10 text-accent",
  royal: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

const ROLE_LABEL: Record<MemberRole, string> = { cliente: "Cliente", incaricato: "Incaricato" };

const inputClass =
  "h-10 glass-input px-3 text-sm";
const labelClass = "text-xs font-medium text-gray-700 dark:text-gray-300";

function displayName(m: { first_name: string | null; last_name: string | null; username: string }) {
  if (m.first_name && m.last_name) return `${m.first_name} ${m.last_name}`;
  return m.username;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

function formatEuro(value: number) {
  return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

const profileInitialState: ProfileState = { error: null, success: false };

function MemberDetail({ member }: { member: ControlCenterMember }) {
  const [editState, editAction, editPending] = useActionState(updateMemberProfile, profileInitialState);
  const [rankPending, startRankTransition] = useTransition();
  const [rankError, setRankError] = useState<string | null>(null);
  const [rankSaved, setRankSaved] = useState(false);
  const [pendingRank, setPendingRank] = useState<Rank | "auto">(member.rankOverride ?? "auto");
  const [suspendPending, startSuspendTransition] = useTransition();
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const isAzienda = member.activity_code === 0;
  const rankDirty = pendingRank !== (member.rankOverride ?? "auto");

  function handleSaveRank() {
    setRankError(null);
    setRankSaved(false);
    const nextRank = pendingRank === "auto" ? null : pendingRank;
    startRankTransition(async () => {
      try {
        await setMemberRankOverride(member.activity_code, nextRank);
        setRankSaved(true);
      } catch (e) {
        setRankError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  function handleSuspend() {
    setSuspendError(null);
    startSuspendTransition(async () => {
      try {
        await suspendMember(member.activity_code, suspendReason.trim() || null);
        setSuspendReason("");
      } catch (e) {
        setSuspendError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  function handleUnsuspend() {
    setSuspendError(null);
    startSuspendTransition(async () => {
      try {
        await unsuspendMember(member.activity_code);
      } catch (e) {
        setSuspendError(e instanceof Error ? e.message : "Errore imprevisto");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3 flex-wrap">
        <div>
          <p className="font-semibold text-gray-900 dark:text-white leading-none">
            <span className="text-gray-500 dark:text-gray-400 font-normal">
              {formatActivityCode(member.activity_code)}
            </span>{" "}
            {displayName(member)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">@{member.username}</p>
        </div>
        <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300">
          {ROLE_LABEL[member.role]}
        </span>
        <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${RANK_BADGE_CLASS[member.rank]}`}>
          {RANK_LABEL[member.rank]}
          {member.rankOverride && " (forzato)"}
        </span>
        {member.suspended && (
          <span className="text-xs font-medium rounded-full px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400">
            Sospeso
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
          <Users size={14} className="text-gray-500 dark:text-gray-400" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{member.teamSize}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Team totale</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
          <Package size={14} className="text-gray-500 dark:text-gray-400" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">{member.piecesSold}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Pezzi venduti</p>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-white/10 p-3">
          <Euro size={14} className="text-gray-500 dark:text-gray-400" />
          <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
            {formatEuro(member.totalEarnings)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Commissioni guadagnate</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Sponsor:{" "}
        {member.sponsorCode !== null ? (
          <span className="text-gray-700 dark:text-gray-300">
            <span className="text-gray-500 dark:text-gray-400">
              {formatActivityCode(member.sponsorCode)}
            </span>{" "}
            {member.sponsorName}
          </span>
        ) : (
          "—"
        )}
        {" · "}Iscritto il {formatDate(member.created_at)}
      </p>

      <div className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
          <Wand2 size={15} />
          <span className="text-sm font-semibold">Rank forzato</span>
        </div>
        <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
          Bypassa le regole automatiche (VIP con 2 diretti attivi, Royal con 10 VIP/Royal in struttura) e si
          applica subito al calcolo commissioni.
        </p>
        {isAzienda ? (
          <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
            L&apos;account aziendale è sempre Royal, non è modificabile.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={pendingRank}
                onChange={(e) => {
                  setPendingRank(e.target.value as Rank | "auto");
                  setRankSaved(false);
                }}
                disabled={rankPending}
                className={`${inputClass} w-fit disabled:opacity-50`}
              >
                <option value="auto">Automatico (calcolato)</option>
                <option value="standard">Forza Standard</option>
                <option value="vip">Forza VIP</option>
                <option value="royal">Forza Royal</option>
              </select>
              <button
                type="button"
                onClick={handleSaveRank}
                disabled={rankPending || !rankDirty}
                className="rounded-lg bg-amber-600 px-3 h-10 text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {rankPending ? "Salvataggio..." : "Salva"}
              </button>
              {rankSaved && !rankDirty && (
                <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvato</span>
              )}
            </div>
            {rankError && <p className="text-xs text-red-600 dark:text-red-400">{rankError}</p>}
          </>
        )}
      </div>

      <div className="rounded-xl border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
          <Ban size={15} />
          <span className="text-sm font-semibold">Sospensione account</span>
        </div>
        {isAzienda ? (
          <p className="text-xs text-red-800/80 dark:text-red-400/80">
            L&apos;account aziendale non può essere sospeso.
          </p>
        ) : member.suspended ? (
          <>
            <p className="text-xs text-red-800/80 dark:text-red-400/80">
              Account sospeso{member.suspendedReason ? `: ${member.suspendedReason}.` : "."} L&apos;utente
              viene disconnesso automaticamente e non può più accedere.
            </p>
            <button
              type="button"
              onClick={handleUnsuspend}
              disabled={suspendPending}
              className="inline-flex items-center gap-2 self-start px-4 h-9 rounded-lg bg-white dark:bg-white/10 border border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-white/15 transition-colors disabled:opacity-50 w-fit"
            >
              <ShieldCheck size={15} />
              {suspendPending ? "Riattivazione..." : "Riattiva account"}
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-red-800/80 dark:text-red-400/80">
              Blocca l&apos;accesso al back office per questo membro. Può essere riattivato in qualsiasi
              momento.
            </p>
            <input
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Motivo (facoltativo)"
              className={`${inputClass} w-full`}
            />
            <button
              type="button"
              onClick={handleSuspend}
              disabled={suspendPending}
              className="inline-flex items-center gap-2 self-start px-4 h-9 rounded-lg bg-red-600 text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 w-fit"
            >
              <Ban size={15} />
              {suspendPending ? "Sospensione..." : "Sospendi account"}
            </button>
          </>
        )}
        {suspendError && <p className="text-xs text-red-600 dark:text-red-400">{suspendError}</p>}
      </div>

      <form action={editAction} className="flex flex-col gap-3">
        <input type="hidden" name="target_code" value={member.activity_code} />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Dati anagrafici</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Nome</span>
            <input name="first_name" defaultValue={member.first_name ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Cognome</span>
            <input name="last_name" defaultValue={member.last_name ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Prefisso</span>
            <input
              name="phone_country_code"
              defaultValue={member.phoneCountryCode ?? ""}
              placeholder="+39"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Telefono</span>
            <input name="phone_number" defaultValue={member.phoneNumber ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Codice fiscale / P.IVA</span>
            <input name="tax_id" defaultValue={member.taxId ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Ragione sociale</span>
            <input name="company_name" defaultValue={member.companyName ?? ""} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Tipo account</span>
            <select name="account_type" defaultValue={member.accountType} className={inputClass}>
              <option value="individual">Privato</option>
              <option value="company">Azienda</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Username</span>
            <input name="username" defaultValue={member.username} className={inputClass} />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={editPending}
            className="glass-btn-primary rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 w-fit"
          >
            {editPending ? "Salvataggio..." : "Salva anagrafica"}
          </button>
          {editState.success && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">Salvato</span>
          )}
          {editState.error && <span className="text-xs text-red-600 dark:text-red-400">{editState.error}</span>}
        </div>
      </form>
    </div>
  );
}

export function ControlCenterExplorer({ members }: { members: ControlCenterMember[] }) {
  const [query, setQuery] = useState("");
  const [selectedCode, setSelectedCode] = useState<number | null>(members[0]?.activity_code ?? null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.username.toLowerCase().includes(q) ||
        displayName(m).toLowerCase().includes(q) ||
        formatActivityCode(m.activity_code).toLowerCase().includes(q),
    );
  }, [members, query]);

  const selected = members.find((m) => m.activity_code === selectedCode);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
      <div className="glass-card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-white/10">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca codice o nome"
              className="w-full pl-9 pr-3 h-10 glass-input text-sm"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-[70vh] divide-y divide-gray-100 dark:divide-white/5">
          {filtered.map((m) => (
            <button
              key={m.activity_code}
              type="button"
              onClick={() => setSelectedCode(m.activity_code)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 ${
                selectedCode === m.activity_code ? "bg-accent/5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    {formatActivityCode(m.activity_code)}
                  </span>{" "}
                  {displayName(m)}
                </p>
                <span className="flex items-center gap-1 shrink-0">
                  {m.rankOverride && (
                    <ShieldAlert size={13} className="text-amber-500" aria-label="Rank forzato" />
                  )}
                  {m.suspended && <Ban size={13} className="text-red-500" aria-label="Sospeso" />}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {ROLE_LABEL[m.role]} · {RANK_LABEL[m.rank]}
                {m.suspended && " · Sospeso"}
              </p>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-sm text-gray-500 dark:text-gray-400 text-center">
              Nessun membro trovato.
            </p>
          )}
        </div>
      </div>

      <div className="glass-card p-6">
        {selected ? (
          <MemberDetail key={selected.activity_code} member={selected} />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Seleziona un membro dall&apos;elenco.</p>
        )}
      </div>
    </div>
  );
}
