export type DonutSlice = {
  label: string;
  value: number;
  color: string;
};

export function DonutChart({
  data,
  centerLabel,
  centerValue,
}: {
  data: DonutSlice[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = data.reduce((sum, d) => sum + Math.max(d.value, 0), 0);

  let acc = 0;
  const stops = data
    .map((d) => {
      const value = Math.max(d.value, 0);
      const start = (acc / total) * 360;
      acc += value;
      const end = (acc / total) * 360;
      return value > 0 ? `${d.color} ${start}deg ${end}deg` : null;
    })
    .filter(Boolean);

  return (
    <div
      className={`relative h-44 w-44 rounded-full shrink-0 ${total <= 0 ? "bg-gray-200 dark:bg-white/10" : ""}`}
      style={total > 0 ? { background: `conic-gradient(${stops.join(", ")})` } : undefined}
    >
      <div className="absolute inset-3 rounded-full bg-[var(--background)] flex flex-col items-center justify-center text-center px-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">{centerLabel}</span>
        <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5">
          {centerValue}
        </span>
      </div>
    </div>
  );
}
