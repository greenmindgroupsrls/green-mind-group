const PALETTE = [
  "bg-pink-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-purple-400",
  "bg-amber-400",
  "bg-teal-400",
  "bg-rose-400",
  "bg-indigo-400",
];

export function avatarColor(code: number) {
  return PALETTE[code % PALETTE.length];
}

export function initials(username: string) {
  return username.slice(0, 2).toUpperCase();
}

export function MemberAvatar({
  code,
  username,
  size = 48,
  ringed = false,
  avatarUrl,
}: {
  code: number;
  username: string;
  size?: number;
  ringed?: boolean;
  avatarUrl?: string | null;
}) {
  const ringClass = ringed
    ? "ring-2 ring-offset-2 ring-accent ring-offset-white dark:ring-offset-[#1c1836]"
    : "";

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={username}
        style={{ height: size, width: size }}
        className={`rounded-full object-cover shrink-0 ${ringClass}`}
      />
    );
  }

  return (
    <div
      style={{ height: size, width: size }}
      className={`rounded-full ${avatarColor(code)} flex items-center justify-center text-white font-semibold text-sm shrink-0 ${ringClass}`}
    >
      {initials(username)}
    </div>
  );
}
