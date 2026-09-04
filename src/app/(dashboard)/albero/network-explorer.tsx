"use client";

import { useMemo, useState } from "react";
import { Search, RotateCcw, User, AtSign, Users, GitBranch, ArrowUpRight, Award } from "lucide-react";
import type { Member } from "@/lib/members";
import { MemberAvatar } from "@/components/member-avatar";
import { PanZoomViewport } from "@/components/pan-zoom-viewport";
import { RANK_LABEL, type Rank } from "@/lib/rank";
import { formatActivityCode } from "@/lib/activity-code";

const RANK_BADGE_CLASS: Record<Rank, string> = {
  standard: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  vip: "bg-accent/10 text-accent",
  royal: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
};

function TreeNode({
  member,
  childrenByParent,
  ranks,
  avatars,
  selectedCode,
  onSelect,
}: {
  member: Member;
  childrenByParent: Map<number, Member[]>;
  ranks: Map<number, Rank>;
  avatars: Record<number, string>;
  selectedCode: number | null;
  onSelect: (code: number) => void;
}) {
  const children = childrenByParent.get(member.activity_code) ?? [];
  const movedByPassUp =
    member.ref_sponsor_code !== null && member.ref_sponsor_code !== member.parent_code;
  const rank = ranks.get(member.activity_code) ?? "standard";

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(member.activity_code)}
        className="flex flex-col items-center gap-1.5"
      >
        <MemberAvatar
          code={member.activity_code}
          username={member.username}
          avatarUrl={avatars[member.activity_code]}
          ringed={selectedCode === member.activity_code}
        />
        <span className="flex flex-col items-center text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-[#1c1836] border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1 shadow-sm whitespace-nowrap">
          <span className="text-[10px] leading-tight text-gray-500 dark:text-gray-400 font-normal">
            {formatActivityCode(member.activity_code)}
          </span>
          <span className="leading-tight">{member.username}</span>
        </span>
        <span
          className={`text-[10px] font-medium rounded-full px-2 py-0.5 ${RANK_BADGE_CLASS[rank]}`}
        >
          {RANK_LABEL[rank]}
        </span>
        {movedByPassUp && (
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-full px-2 py-0.5">
            spostato
          </span>
        )}
      </button>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <TreeNode
              key={child.activity_code}
              member={child}
              childrenByParent={childrenByParent}
              ranks={ranks}
              avatars={avatars}
              selectedCode={selectedCode}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export function NetworkExplorer({
  members,
  ranks: ranksByCode,
  rootCode,
  avatars,
}: {
  members: Member[];
  ranks: Record<number, Rank>;
  rootCode: number;
  avatars: Record<number, string>;
}) {
  const [selectedCode, setSelectedCode] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [notFound, setNotFound] = useState(false);

  const byCode = useMemo(() => {
    const map = new Map<number, Member>();
    for (const m of members) map.set(m.activity_code, m);
    return map;
  }, [members]);

  const ranks = useMemo(
    () => new Map(Object.entries(ranksByCode).map(([code, rank]) => [Number(code), rank])),
    [ranksByCode],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<number, Member[]>();
    for (const member of members) {
      if (member.parent_code === null) continue;
      const siblings = map.get(member.parent_code) ?? [];
      siblings.push(member);
      map.set(member.parent_code, siblings);
    }
    return map;
  }, [members]);

  const directsCount = useMemo(() => {
    if (selectedCode === null) return 0;
    return (childrenByParent.get(selectedCode) ?? []).length;
  }, [childrenByParent, selectedCode]);

  const root = byCode.get(rootCode);
  const selected = selectedCode !== null ? byCode.get(selectedCode) : undefined;
  const selectedRank = selected ? ranks.get(selected.activity_code) ?? "standard" : "standard";
  const refSponsor =
    selected?.ref_sponsor_code !== null && selected?.ref_sponsor_code !== undefined
      ? byCode.get(selected.ref_sponsor_code)
      : undefined;
  const structuralParent =
    selected?.parent_code !== null && selected?.parent_code !== undefined
      ? byCode.get(selected.parent_code)
      : undefined;

  function handleSearch() {
    const match = members.find((m) =>
      m.username.toLowerCase().includes(query.trim().toLowerCase()),
    );
    if (match) {
      setSelectedCode(match.activity_code);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  }

  function handleReset() {
    setQuery("");
    setNotFound(false);
    setSelectedCode(null);
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
        Team: albero strutturale
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mt-1">
        Posizione usata per le commissioni. Clicca un nodo per vederne il dettaglio.
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-6">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Cerca username"
            className="pl-9 pr-3 py-2 text-sm glass-input w-full sm:w-64"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleSearch}
            className="glass-btn-primary rounded-lg px-4 py-2 text-sm font-medium text-white"
          >
            Cerca
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-white/10 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            <RotateCcw size={14} />
            Reset
          </button>
          {notFound && (
            <span className="text-sm text-red-600 dark:text-red-400">Nessun risultato</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 mt-6">
        <div className="glass-card">
          {!root ? (
            <p className="text-gray-500 dark:text-gray-400 p-8">Nessun dato.</p>
          ) : (
            <PanZoomViewport>
              <ul className="org-tree">
                <TreeNode
                  member={root}
                  childrenByParent={childrenByParent}
                  ranks={ranks}
                  avatars={avatars}
                  selectedCode={selectedCode}
                  onSelect={setSelectedCode}
                />
              </ul>
            </PanZoomViewport>
          )}
        </div>

        <div className="glass-card p-6 h-fit sticky top-6">
          {!selected ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Seleziona un nodo dell&apos;albero per vederne il dettaglio.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <MemberAvatar
                  code={selected.activity_code}
                  username={selected.username}
                  avatarUrl={avatars[selected.activity_code]}
                  size={56}
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selected.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    codice {formatActivityCode(selected.activity_code)}
                  </p>
                </div>
              </div>

              <DetailRow icon={AtSign} label="Username" value={selected.username} />
              <DetailRow
                icon={Award}
                label="Rank"
                value={
                  <span
                    className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${RANK_BADGE_CLASS[selectedRank]}`}
                  >
                    {RANK_LABEL[selectedRank]}
                  </span>
                }
              />
              <DetailRow
                icon={User}
                label="Iscritto da (ref)"
                value={
                  refSponsor
                    ? `${formatActivityCode(refSponsor.activity_code)} ${refSponsor.username}`
                    : "—"
                }
              />
              <DetailRow
                icon={GitBranch}
                label="Posizione strutturale (sotto)"
                value={
                  structuralParent
                    ? `${formatActivityCode(structuralParent.activity_code)} ${structuralParent.username}`
                    : "Company"
                }
              />
              {refSponsor && structuralParent && refSponsor.activity_code !== structuralParent.activity_code && (
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <ArrowUpRight size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Pass-up</p>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                      Spostato dalla posizione iniziale (ref) a quella attuale
                    </p>
                  </div>
                </div>
              )}
              <DetailRow icon={Users} label="Diretti strutturali" value={directsCount} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
