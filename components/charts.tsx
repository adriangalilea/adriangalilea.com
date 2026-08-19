"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const BEFORE = "var(--muted-foreground)";
const AFTER = "var(--accent-pop)";

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <figcaption className="mt-2 text-center text-xs text-muted-foreground">
      {children}
    </figcaption>
  );
}

function Legend({ beforeName, afterName }: { beforeName: string; afterName: string }) {
  return (
    <div className="mb-3 flex items-center justify-center gap-5 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-[2px] opacity-40" style={{ background: BEFORE }} />
        {beforeName}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2 rounded-[2px]" style={{ background: AFTER }} />
        {afterName}
      </span>
    </div>
  );
}

type ComparePoint = { label: string; before: number; after: number };

/** Grouped before/after bars; the Δ% each pair earns is printed under its label. */
export function CompareBars({
  data,
  beforeName = "before",
  afterName = "after",
  unit = "",
  caption,
}: {
  data: ComparePoint[];
  beforeName?: string;
  afterName?: string;
  unit?: string;
  caption?: string;
}) {
  const config = {
    before: { label: beforeName, color: BEFORE },
    after: { label: afterName, color: AFTER },
  } satisfies ChartConfig;

  const deltas = new Map(
    data.map((d) => [d.label, `${d.after >= d.before ? "+" : ""}${(((d.after - d.before) / d.before) * 100).toFixed(1)}%`]),
  );

  const Tick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) => (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" className="fill-foreground text-xs">
        {payload?.value}
      </text>
      <text dy={28} textAnchor="middle" className="text-xs font-medium tabular-nums" style={{ fill: AFTER }}>
        {deltas.get(payload?.value ?? "")}
      </text>
    </g>
  );

  return (
    <figure className="not-prose my-8">
      <Legend beforeName={beforeName} afterName={afterName} />
      <ChartContainer config={config} className="aspect-[2/1] w-full">
        <BarChart data={data} margin={{ top: 20, left: 4, right: 4 }} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} height={40} tick={<Tick />} />
          <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.5 }} content={<ChartTooltipContent />} />
          <Bar dataKey="before" fill={BEFORE} fillOpacity={0.35} radius={[3, 3, 0, 0]}>
            <LabelList position="top" offset={6} className="fill-muted-foreground tabular-nums" fontSize={11} />
          </Bar>
          <Bar dataKey="after" fill={AFTER} radius={[3, 3, 0, 0]}>
            <LabelList position="top" offset={6} className="fill-foreground tabular-nums" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartContainer>
      {caption ? <Caption>{caption}{unit ? ` (${unit})` : ""}</Caption> : null}
    </figure>
  );
}

type BarPoint = { label: string; value: number; accent?: boolean };

/** Horizontal bars, label above each bar, value at its end. */
export function Bars({
  data,
  unit = "",
  caption,
}: {
  data: BarPoint[];
  unit?: string;
  caption?: string;
}) {
  const config = { value: { label: unit || "value" } } satisfies ChartConfig;
  const rows = data.map((d) => ({ ...d, fill: d.accent ? AFTER : BEFORE, opacity: d.accent ? 1 : 0.35 }));

  const NameLabel = (props: { x?: number | string; y?: number | string; index?: number }) => {
    const { x, y, index } = props;
    const d = rows[index ?? 0];
    if (!d) return null;
    return (
      <text x={Number(x)} y={Number(y) - 7} className="fill-foreground text-xs">
        {d.label}
      </text>
    );
  };

  return (
    <figure className="not-prose my-8">
      <ChartContainer config={config} className="w-full" style={{ height: data.length * 58 + 8 }}>
        <BarChart data={rows} layout="vertical" margin={{ top: 18, left: 4, right: 44 }} barCategoryGap="38%">
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="label" hide />
          <Bar dataKey="value" radius={3} isAnimationActive={false}>
            <LabelList content={<NameLabel />} />
            <LabelList
              position="right"
              offset={8}
              className="fill-foreground font-medium tabular-nums"
              fontSize={12}
              formatter={(v) => `${v}${unit}`}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      {caption ? <Caption>{caption}</Caption> : null}
    </figure>
  );
}
