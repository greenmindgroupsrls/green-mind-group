import { formatActivityCode } from "@/lib/activity-code";

export function LockedRefField({ code, username }: { code: number; username: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Sei stato invitato da
      </span>
      <div className="h-11 flex items-center rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 px-3.5 text-sm">
        <span className="text-gray-500 dark:text-gray-400">{formatActivityCode(code)}</span>{" "}
        {username}
      </div>
      <input type="hidden" name="ref_code" value={code} />
    </label>
  );
}
