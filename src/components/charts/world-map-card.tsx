"use client";

import { useMemo, useState } from "react";
import { Plus, Minus } from "lucide-react";
import worldMapData from "@/lib/world-map-data";
import { countryNameToIso2 } from "@/lib/countries";

type WorldMapLocation = { id: string; name: string; path: string };
type WorldMapData = { label: string; viewBox: string; locations: WorldMapLocation[] };
const worldMap = worldMapData as unknown as WorldMapData;

type HoverState = { name: string; count: number; x: number; y: number };

export function WorldMapCard({ countries }: { countries: Record<number, string> }) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showAll, setShowAll] = useState(false);

  const countsByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const name of Object.values(countries)) {
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return map;
  }, [countries]);

  const countsByIso2 = useMemo(() => {
    const map = new Map<string, number>();
    for (const [name, count] of countsByName) {
      const iso2 = countryNameToIso2(name);
      if (iso2) map.set(iso2, count);
    }
    return map;
  }, [countsByName]);

  const total = useMemo(
    () => Array.from(countsByName.values()).reduce((sum, n) => sum + n, 0),
    [countsByName],
  );

  const legend = useMemo(
    () =>
      Array.from(countsByName.entries())
        .map(([name, count]) => ({ name, count, pct: total > 0 ? (count / total) * 100 : 0 }))
        .sort((a, b) => b.count - a.count),
    [countsByName, total],
  );

  const visibleLegend = showAll ? legend : legend.slice(0, 4);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#151129] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 dark:text-white">Affiliate Joinings</h2>
        {legend.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAll((s) => !s)}
            className="text-sm font-medium text-accent hover:opacity-80"
          >
            {showAll ? "Mostra meno" : "Mostra tutti"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        <div
          className="relative rounded-lg bg-gray-50 dark:bg-white/5 overflow-hidden"
          style={{ height: 340 }}
        >
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + 0.5, 4))}
              className="h-7 w-7 rounded bg-gray-900/80 text-white flex items-center justify-center hover:bg-gray-900"
              aria-label="Zoom avanti"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - 0.5, 1))}
              className="h-7 w-7 rounded bg-gray-900/80 text-white flex items-center justify-center hover:bg-gray-900"
              aria-label="Zoom indietro"
            >
              <Minus size={14} />
            </button>
          </div>

          <svg
            viewBox={worldMap.viewBox}
            className="w-full h-full"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.2s" }}
            role="img"
            aria-label="Mappa dei paesi in cui è presente il tuo team"
          >
            {worldMap.locations.map((loc) => {
              const count = countsByIso2.get(loc.id);
              const highlighted = !!count;
              return (
                <path
                  key={loc.id}
                  d={loc.path}
                  stroke="var(--background)"
                  strokeWidth={0.6}
                  className={
                    highlighted
                      ? "fill-accent cursor-pointer transition-opacity hover:opacity-80"
                      : "fill-gray-200 dark:fill-white/10"
                  }
                  onMouseEnter={(e) =>
                    highlighted &&
                    setHover({ name: loc.name, count: count!, x: e.clientX, y: e.clientY })
                  }
                  onMouseMove={(e) =>
                    highlighted && setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h))
                  }
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </svg>

          {hover && (
            <div
              className="fixed z-50 pointer-events-none rounded-lg bg-gray-900 text-white text-xs px-2.5 py-1.5 shadow-lg"
              style={{ left: hover.x + 14, top: hover.y + 14 }}
            >
              <div className="font-medium">{hover.name}</div>
              <div>
                {hover.count} {hover.count === 1 ? "iscritto" : "iscritti"}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          {visibleLegend.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Nessun paese registrato ancora nel tuo team.
            </p>
          ) : (
            visibleLegend.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{item.name}:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {item.pct.toFixed(2)}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-white/10 mt-1.5 overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
