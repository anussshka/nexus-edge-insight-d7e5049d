type Status = "RUNNING" | "IDLE" | "OFFLINE" | string;

export function statusColor(s: Status) {
  const u = (s || "OFFLINE").toUpperCase();
  if (u === "RUNNING") return { bg: "bg-[var(--success)]", text: "text-white", border: "border-l-[var(--success)]", raw: "#10b981" };
  if (u === "IDLE") return { bg: "bg-[var(--warning)]", text: "text-white", border: "border-l-[var(--warning)]", raw: "#f59e0b" };
  return { bg: "bg-gray-500", text: "text-white", border: "border-l-gray-500", raw: "#6b7280" };
}

export function StatusPill({ status }: { status: Status }) {
  const c = statusColor(status);
  const u = (status || "OFFLINE").toUpperCase();
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`h-2 w-2 rounded-full bg-white ${u === "RUNNING" ? "pulse-dot" : ""}`} />
      {u}
    </span>
  );
}
