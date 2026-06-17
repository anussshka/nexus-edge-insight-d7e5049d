import { useEffect, useRef, useState } from "react";
import type { LatestReading, SummaryData } from "@/lib/api";

export const WIDGET_LIST: Array<{ id: string; title: string }> = [
  { id: "abs_position", title: "Absolute Position" },
  { id: "rel_position", title: "Relative Position" },
  { id: "mach_position", title: "Machine Position" },
  { id: "axis_feedrate", title: "Axis Feedrate" },
  { id: "axis_load", title: "Axis Load" },
  { id: "spindle", title: "Spindle Speed & Feed" },
  { id: "spindle_load", title: "Spindle Load" },
  { id: "program", title: "Current Program" },
  { id: "part_count", title: "Part Count" },
  { id: "axis_current", title: "Axis Current" },
];

function fmt(v: number | undefined | null, d: number) {
  if (v === undefined || v === null || Number.isNaN(v)) return "—";
  return Number(v).toFixed(d);
}

function FlashValue({ value, className }: { value: string | number; className?: string }) {
  const [flash, setFlash] = useState(false);
  const prev = useRef<string | number>(value);
  useEffect(() => {
    if (prev.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      prev.current = value;
      return () => clearTimeout(t);
    }
  }, [value]);
  return <span className={`${className || ""} ${flash ? "flash-value" : ""} rounded px-1`}>{value}</span>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{title}</div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TwoRow({
  rows,
}: {
  rows: Array<{ label: string; value: string; unit: string; avg?: string }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-semibold text-muted-foreground">{r.label}</span>
            <FlashValue value={r.value} className="font-mono text-2xl font-bold text-foreground" />
            <span className="text-xs text-muted-foreground">{r.unit}</span>
          </div>
          {r.avg !== undefined && (
            <div className="font-mono text-[11px] text-muted-foreground">Avg {r.avg} {r.unit}</div>
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  widgetId: string;
  latest: LatestReading | null;
  summary: SummaryData | null;
}

function getAvg(summary: SummaryData | null, key: string, d: number): string {
  const v = summary?.averages?.[key];
  return v === undefined || v === null ? "—" : Number(v).toFixed(d);
}

export function Widget({ widgetId, latest, summary }: Props) {
  const w = WIDGET_LIST.find((x) => x.id === widgetId);
  if (!w) return null;
  const l = latest || {};

  switch (widgetId) {
    case "abs_position":
      return (
        <Card title={w.title}>
          <TwoRow rows={[
            { label: "X", value: fmt(l.abs_1 as number, 3), unit: "mm", avg: getAvg(summary, "abs_1", 3) },
            { label: "Z", value: fmt(l.abs_2 as number, 3), unit: "mm", avg: getAvg(summary, "abs_2", 3) },
          ]} />
        </Card>
      );
    case "rel_position":
      return (
        <Card title={w.title}>
          <TwoRow rows={[
            { label: "X", value: fmt(l.rel_1 as number, 3), unit: "mm", avg: getAvg(summary, "rel_1", 3) },
            { label: "Z", value: fmt(l.rel_2 as number, 3), unit: "mm", avg: getAvg(summary, "rel_2", 3) },
          ]} />
        </Card>
      );
    case "mach_position":
      return (
        <Card title={w.title}>
          <TwoRow rows={[
            { label: "X", value: fmt(l.mach_1 as number, 3), unit: "mm", avg: getAvg(summary, "mach_1", 3) },
            { label: "Z", value: fmt(l.mach_2 as number, 3), unit: "mm", avg: getAvg(summary, "mach_2", 3) },
          ]} />
        </Card>
      );
    case "axis_feedrate":
      return (
        <Card title={w.title}>
          <TwoRow rows={[
            { label: "X", value: fmt(l.feedrate as number, 0), unit: "mm/min", avg: getAvg(summary, "feedrate", 0) },
            { label: "Z", value: fmt(l.feedrate as number, 0), unit: "mm/min", avg: getAvg(summary, "feedrate", 0) },
          ]} />
        </Card>
      );
    case "axis_load":
      return (
        <Card title={w.title}>
          <TwoRow rows={[
            { label: "X", value: fmt(l.load_1 as number, 0), unit: "%", avg: getAvg(summary, "load_1", 0) },
            { label: "Z", value: fmt(l.load_2 as number, 0), unit: "%", avg: getAvg(summary, "load_2", 0) },
          ]} />
        </Card>
      );
    case "spindle":
      return (
        <Card title={w.title}>
          <div className="space-y-3">
            <div>
              <div className="flex items-baseline gap-2">
                <FlashValue value={fmt(l.spindle_speed as number, 0)} className="font-mono text-3xl font-bold text-foreground" />
                <span className="text-xs text-muted-foreground">rpm</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">Avg {getAvg(summary, "spindle_speed", 0)} rpm</div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <FlashValue value={fmt(l.feedrate as number, 0)} className="font-mono text-3xl font-bold text-foreground" />
                <span className="text-xs text-muted-foreground">mm/min</span>
              </div>
              <div className="font-mono text-[11px] text-muted-foreground">Avg {getAvg(summary, "feedrate", 0)} mm/min</div>
            </div>
          </div>
        </Card>
      );
    case "spindle_load": {
      const v = (l.spindle_load as number) ?? 0;
      const color = v > 85 ? "var(--danger)" : v >= 60 ? "var(--warning)" : "var(--success)";
      const max = summary?.maxes?.spindle_load;
      return (
        <Card title={w.title}>
          <div className="flex items-baseline gap-2">
            <FlashValue value={fmt(l.spindle_load as number, 0)} className="font-mono text-4xl font-bold text-foreground" />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, v)}%`, backgroundColor: color }} />
          </div>
          <div className="mt-2 font-mono text-[11px] text-muted-foreground">
            Max ever {max !== undefined ? Number(max).toFixed(0) : getAvg(summary, "spindle_load", 0)} %
          </div>
        </Card>
      );
    }
    case "program":
      return (
        <Card title={w.title}>
          <FlashValue value={String(l.prog_name ?? "—")} className="block font-mono text-2xl font-bold text-foreground" />
          <div className="mt-2 font-mono text-xs text-muted-foreground">
            O{l.prog_number ?? "—"} · N{l.seq_number ?? "—"}
          </div>
        </Card>
      );
    case "part_count":
      return (
        <Card title={w.title}>
          <FlashValue value={fmt(l.part_count as number, 0)} className="block font-mono text-4xl font-bold text-foreground" />
          <div className="mt-3 font-mono text-[11px] text-muted-foreground">
            Total samples recorded {summary?.total_samples ?? "—"}
          </div>
        </Card>
      );
    case "axis_current":
      return (
        <Card title={w.title}>
          <TwoRow rows={[
            { label: "X", value: fmt(l.curr_1 as number, 1), unit: "A", avg: getAvg(summary, "curr_1", 1) },
            { label: "Z", value: fmt(l.curr_2 as number, 1), unit: "A", avg: getAvg(summary, "curr_2", 1) },
          ]} />
        </Card>
      );
  }
  return null;
}
