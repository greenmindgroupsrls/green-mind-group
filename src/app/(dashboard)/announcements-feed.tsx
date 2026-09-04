import { Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementComposer } from "./announcement-composer";

type Announcement = {
  id: number;
  title: string;
  body: string;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export async function AnnouncementsFeed({
  isRoot,
  usingMockData,
}: {
  isRoot: boolean;
  usingMockData: boolean;
}) {
  if (usingMockData) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, created_at")
    .order("created_at", { ascending: false })
    .limit(3);

  const announcements = (data ?? []) as Announcement[];

  if (announcements.length === 0 && !isRoot) return null;

  return (
    <div className="glass-card mb-6">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-accent" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Annunci</h2>
        </div>
        {isRoot && <AnnouncementComposer />}
      </div>
      {announcements.length === 0 ? (
        <p className="px-6 py-6 text-sm text-gray-500 dark:text-gray-400">Nessun annuncio ancora.</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
          {announcements.map((a) => (
            <div key={a.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title}</p>
                <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                  {formatDate(a.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
