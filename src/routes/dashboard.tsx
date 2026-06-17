import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Settings } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Widget } from "@/components/Widget";
import { useAuth } from "@/lib/auth";
import {
  getLatest, getSummary, getLayout,
  type Machine, type LatestReading, type SummaryData, type LayoutCell,
} from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({ meta: [{ title: "Dashboard — NexusEdge" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machine, setMachine] = useState<Machine | null>(null);
  const [layout, setLayout] = useState<LayoutCell[] | null>(null);
  const [latest, setLatest] = useState<LatestReading | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [status, setStatus] = useState<string>("OFFLINE");
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(true);

  useEffect(() => {
    if (!user) { navigate({ to: "/" }); return; }
    const raw = sessionStorage.getItem("cnc_selected_machine");
    if (!raw) { navigate({ to: "/machines" }); return; }
    const m = JSON.parse(raw) as Machine;
    setMachine(m);
    const company_id = user.company_id!;
    getLayout(company_id, m.machine_id)
      .then(setLayout)
      .catch(() => setLayout([]))
      .finally(() => setLoadingLayout(false));
  }, [user, navigate]);

  // Live polling
  useEffect(() => {
    if (!machine) return;
    let alive = true;
    const tick = async () => {
      try {
        const d = await getLatest(machine.api_port);
        if (!alive) return;
        setLatest(d);
        setStatus((d.status || "IDLE").toUpperCase());
        if (d.last_seen) setLastSeen(String(d.last_seen));
      } catch {
        if (alive) setStatus("OFFLINE");
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(id); };
  }, [machine]);

  // Summary polling
  useEffect(() => {
    if (!machine) return;
    let alive = true;
    const tick = async () => {
      try { const s = await getSummary(machine.api_port); if (alive) setSummary(s); }
      catch { /* keep previous */ }
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => { alive = false; clearInterval(id); };
  }, [machine]);

  if (!machine || loadingLayout) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const cells: LayoutCell[] = Array.from({ length: 16 }, (_, i) =>
    layout?.find((c) => c.cell_index === i) ?? { cell_index: i, widget_id: null }
  );
  const hasAnyWidget = cells.some((c) => c.widget_id);
  const statusBg = status === "RUNNING" ? "var(--success)" : status === "IDLE" ? "var(--warning)" : "#374151";

  return (
    <div className="min-h-screen">
      <Navbar>
        <div className="flex items-center gap-3">
          <Link to="/machines" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{machine.name}</span>
          <span className="font-mono text-xs text-muted-foreground">{machine.ip}</span>
        </div>
      </Navbar>

      <div
        className="flex items-center justify-between px-6 py-3 text-sm font-bold uppercase tracking-widest text-white transition-colors"
        style={{ backgroundColor: statusBg }}
      >
        <span>● {status}</span>
        {status === "OFFLINE" && lastSeen && (
          <span className="font-mono text-xs font-normal opacity-90">Last seen: {lastSeen}</span>
        )}
      </div>

      <main className="mx-auto max-w-[1600px] px-6 py-6">
        {!hasAnyWidget ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <Settings className="h-14 w-14 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold text-foreground">Dashboard not configured</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ask your Super Admin to set up the layout.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-4">
            {cells.map((c) =>
              c.widget_id ? (
                <Widget key={c.cell_index} widgetId={c.widget_id} latest={latest} summary={summary} />
              ) : (
                <div
                  key={c.cell_index}
                  className="breathing flex min-h-[140px] items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/30 text-xs text-muted-foreground"
                >
                  Cell {c.cell_index + 1}
                </div>
              )
            )}
          </div>
        )}
      </main>
    </div>
  );
}
