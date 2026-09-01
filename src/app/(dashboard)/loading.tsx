export default function DashboardLoading() {
  return (
    <div className="p-8 animate-pulse">
      <div className="h-7 w-48 rounded bg-gray-100 dark:bg-white/10 mb-2" />
      <div className="h-4 w-72 rounded bg-gray-100 dark:bg-white/10 mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="h-64 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5" />
        <div className="h-64 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5" />
      </div>
    </div>
  );
}
