import { SupportNav } from "./support-nav";

export default function SupportLayout({ children }: LayoutProps<"/support">) {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Support</h1>
      <p className="text-gray-600 dark:text-gray-300 mt-1">
        Materiali di formazione e assistenza.
      </p>

      <div className="mt-6">
        <SupportNav />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
