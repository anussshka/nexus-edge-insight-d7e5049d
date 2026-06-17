import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/lib/auth";
import {
  getCompanies, getLatest, getLayout, saveLayout, resetLayout,
  type Company, type Machine, type LayoutCell,
} from "@/lib/api";
import { Building2, Cpu, Activity, Power, Loader2, X, ExternalLink, AlertCircle } from "lucide-react";
import { WIDGET_LIST } from "@/components/Widget";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Super Admin — NexusEdge" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [drawer, setDrawer] = useState<{ company: Company; machine: Machine } | null>(null);

  useEffect(() => {
    if (!user) { navigate({ to: "/" }); return; }
    if (user.role !== "super") { navigate({ to: "/machines" }); return; }
    load();
  }, [user, navigate]);

  const load = () => {
    setErr(null);
    getCompanies().then(setCompanies).catch(() => setErr("Could not reach the master API at :9000"));
  };

  // Poll all machine statuses
  useEffect(() => {
    if (!companies) return;
    const all: Machine[] = companies.flatMap((c) => c.machines);
    let alive = true;
    const tick = async () => {
      const next: Record<string, string> = {};
      await Promise.all(all.map(async (m) => {
        try { const d = await getLatest(m.api_port); next[m.id] = (d.status || "IDLE").toUpperCase(); }
        catch { next[m.id] = "OFFLINE"; }
      }));
      if (alive) setStatuses(next);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(id); };
  }, [companies]);

  const counts = useMemo(() => {
    const all = Object.values(statuses);
    return {
      companies: companies?.length ?? 0,
      running: all.filter((s) => s === "RUNNING").length,
      idle: all.filter((s) => s === "IDLE").length,
      offline: all.filter((s) => s === "OFFLINE").length,
    };
  }, [companies, statuses]);

  if (err) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-[var(--danger)]" />
          <h2 className="mt-4 text-xl font-bold">Master API unreachable</h2>
          <p className="mt-2 text-sm text-muted-foreground">{err}</p>
          <button onClick={load} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Retry</button>
        </div>
      </div>
    );
  }

  const openView = (c: Company) => {
    const view = { username: c.username, role: "company_admin" as const, company_id: c.id, company_name: c.name };
    localStorage.setItem("cnc_view_as", JSON.stringify(view));
    window.open("/machines", "_blank");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-3xl font-bold">Super Admin Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage companies, machines, and dashboard layouts</p>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<Building2 />} color="#3b82f6" label="Total Companies" value={counts.companies} />
          <StatCard icon={<Activity />} color="#10b981" label="Running" value={counts.running} />
          <StatCard icon={<Cpu />} color="#f59e0b" label="Idle" value={counts.idle} />
          <StatCard icon={<Power />} color="#6b7280" label="Offline" value={counts.offline} />
        </div>

        <h2 className="mt-10 text-xl font-bold">Registered Companies</h2>
        {!companies ? (
          <div className="mt-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {companies.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{c.name}</h3>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">@{c.username} · {c.machines.length} machine(s)</div>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  {c.machines.map((m) => {
                    const s = statuses[m.id] || "OFFLINE";
                    const color = s === "RUNNING" ? "var(--success)" : s === "IDLE" ? "var(--warning)" : "#6b7280";
                    return (
                      <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold">{m.name}</div>
                          <div className="font-mono text-xs text-muted-foreground">{m.ip}:{m.api_port}</div>
                        </div>
                        <button
                          onClick={() => setDrawer({ company: c, machine: m })}
                          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                        >Configure Layout</button>
                        <button
                          onClick={() => openView(c)}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> View Dashboard
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {drawer && (
        <LayoutDrawer
          company={drawer.company}
          machine={drawer.machine}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: color + "22", color }}>
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="font-mono text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function LayoutDrawer({ company, machine, onClose }: { company: Company; machine: Machine; onClose: () => void }) {
  const [cells, setCells] = useState<LayoutCell[]>(
    Array.from({ length: 16 }, (_, i) => ({ cell_index: i, widget_id: null }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragWidget, setDragWidget] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  useEffect(() => {
    getLayout(company.id, machine.id)
      .then((l) => {
        const next = Array.from({ length: 16 }, (_, i) => ({
          cell_index: i,
          widget_id: l.find((c) => c.cell_index === i)?.widget_id ?? null,
        }));
        setCells(next);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [company.id, machine.id]);

  const placed = new Set(cells.map((c) => c.widget_id).filter(Boolean) as string[]);

  const handleDrop = (idx: number) => {
    if (!dragWidget) return;
    setCells((cur) =>
      cur.map((c) => {
        if (c.widget_id === dragWidget) return { ...c, widget_id: null };
        if (c.cell_index === idx) return { ...c, widget_id: dragWidget };
        return c;
      })
    );
    setDragWidget(null);
    setDragOver(null);
  };

  const remove = (idx: number) =>
    setCells((cur) => cur.map((c) => (c.cell_index === idx ? { ...c, widget_id: null } : c)));

  const onSave = async () => {
    setSaving(true);
    try {
      await saveLayout(company.id, machine.id, cells);
      toast.success("Layout saved successfully");
    } catch {
      toast.error("Failed to save layout");
    } finally { setSaving(false); }
  };

  const onReset = async () => {
    setSaving(true);
    try {
      await resetLayout(company.id, machine.id);
      setCells(Array.from({ length: 16 }, (_, i) => ({ cell_index: i, widget_id: null })));
      toast.success("Layout reset");
    } catch {
      toast.error("Failed to reset layout");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="drawer-slide absolute right-0 top-0 h-full w-full max-w-[960px] overflow-y-auto border-l border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background p-6">
          <div>
            <h2 className="text-2xl font-bold">Configure Dashboard Layout</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {company.name} · <span className="font-mono">{machine.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onReset} disabled={saving} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Reset</button>
            <button onClick={onSave} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saving ? "Saving..." : "Save Layout"}
            </button>
            <button onClick={onClose} className="ml-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[260px_1fr]">
            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Available Widgets</h3>
              <div className="space-y-2">
                {WIDGET_LIST.map((w) => {
                  const used = placed.has(w.id);
                  return (
                    <div
                      key={w.id}
                      draggable={!used}
                      onDragStart={() => setDragWidget(w.id)}
                      onDragEnd={() => setDragWidget(null)}
                      className={`rounded-lg border border-border p-3 text-sm transition-all ${
                        used ? "cursor-not-allowed bg-muted/40 opacity-40" : "cursor-grab bg-card hover:border-primary active:scale-95 active:opacity-70"
                      }`}
                    >
                      <div className="font-semibold">{w.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{w.id}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Grid Editor (4×4)</h3>
              <div className="grid grid-cols-4 gap-3">
                {cells.map((c) => {
                  const w = WIDGET_LIST.find((x) => x.id === c.widget_id);
                  const isOver = dragOver === c.cell_index;
                  return (
                    <div
                      key={c.cell_index}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(c.cell_index); }}
                      onDragLeave={() => setDragOver((v) => (v === c.cell_index ? null : v))}
                      onDrop={(e) => { e.preventDefault(); handleDrop(c.cell_index); }}
                      className={`relative flex aspect-square flex-col justify-between rounded-lg border-2 p-2 text-xs transition-all ${
                        isOver ? "border-primary bg-primary/10" :
                        w ? "border-primary/40 bg-card" : "border-dashed border-border bg-card/30"
                      }`}
                    >
                      {w ? (
                        <>
                          <button
                            onClick={() => remove(c.cell_index)}
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--danger)] text-white hover:opacity-90"
                          ><X className="h-3 w-3" /></button>
                          <div className="mt-3 font-semibold text-primary">{w.title}</div>
                        </>
                      ) : (
                        <div className="flex flex-1 items-center justify-center text-muted-foreground">Drop here</div>
                      )}
                      <div className="font-mono text-[10px] text-muted-foreground">#{c.cell_index + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
