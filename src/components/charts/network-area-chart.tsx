"use client";

import { useState } from "react";

type Point = { label: string; value: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;

function niceMax(value: number) {
  if (value <= 0) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const normalized = value / magnitude;
  const step = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function NetworkAreaChart({ data }: { data: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const xy = data.map((d, i) => ({
    x: PAD_LEFT + stepX * i,
    y: PAD_TOP + plotHeight * (1 - d.value / max),
  }));

  const linePath = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${xy[xy.length - 1]?.x ?? PAD_LEFT},${PAD_TOP + plotHeight} L${PAD_LEFT},${PAD_TOP + plotHeight} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredXY = hoverIndex !== null ? xy[hoverIndex] : null;

  return (
    <div
      className="viz-root relative"
      style={
        {
          "--series-1": "#2a78d6",
          "--text-secondary": "currentColor",
          "--muted": "#898781",
          "--gridline": "var(--tree-line)",
        } as React.CSSProperties
      }
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Nuovi iscritti alla rete per mese"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {yTicks.map((tick) => {
          const y = PAD_TOP + plotHeight * (1 - tick / max);
          return (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                stroke="var(--gridline)"
                strokeWidth={1}
              />
              <text x={0} y={y + 3} fontSize={10} fill="var(--muted)">
                {tick}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="var(--series-1)" opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {xy.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - stepX / 2}
              y={PAD_TOP}
              width={stepX || plotWidth}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
            />
            {(i === xy.length - 1 || hoverIndex === i) && (
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill="var(--series-1)"
                stroke="var(--background)"
                strokeWidth={2}
              />
            )}
          </g>
        ))}

        {hoveredXY && (
          <line
            x1={hoveredXY.x}
            x2={hoveredXY.x}
            y1={PAD_TOP}
            y2={PAD_TOP + plotHeight}
            stroke="var(--gridline)"
            strokeWidth={1}
          />
        )}

        {data.map((d, i) => (
          <text
            key={d.label}
            x={xy[i].x}
            y={HEIGHT - 8}
            fontSize={10}
            fill="var(--muted)"
            textAnchor="middle"
          >
            {d.label}
          </text>
        ))}
      </svg>

      {hovered && hoveredXY && (
        <div
          className="absolute pointer-events-none rounded-lg bg-gray-900 dark:bg-black text-white text-xs px-2.5 py-1.5 shadow-lg -translate-x-1/2 -translate-y-full"
          style={{ left: `${(hoveredXY.x / WIDTH) * 100}%`, top: `${(hoveredXY.y / HEIGHT) * 100 - 2}%` }}
        >
          <div className="font-medium">{hovered.label}</div>
          <div>{hovered.value} iscritti</div>
        </div>
      )}
    </div>
  );
}
