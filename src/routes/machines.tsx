import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusPill, statusColor } from "@/components/StatusPill";
import { getMachines, getLatest, type Machine, type LatestReading } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Loader2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/machines")({
  ssr: false,
  head: () => ({ meta: [{ title: "Machines — NexusEdge" }] }),
  component: MachinesPage,
});

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function MachineCard({ m, onClick }: { m: Machine; onClick: () => void }) {
  const [latest, setLatest] = useState<LatestReading | null>(null);
  const [status, setStatus] = useState<string>("OFFLINE");

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const d = await getLatest(m.api_port);
        if (!cancelled) { setLatest(d); setStatus((d.status || "IDLE").toUpperCase()); }
      } catch {
        if (!cancelled) setStatus("OFFLINE");
      }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [m.api_port]);

  const c = statusColor(status);
  return (
    <button
      onClick={onClick}
      className={`card-hover-lift group flex flex-col rounded-xl border border-border border-l-4 bg-card p-5 text-left ${c.border}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-foreground">{m.name}</h3>
          <div className="mt-1 font-mono text-xs text-muted-foreground">{m.ip}:{m.api_port}</div>
        </div>
        <StatusPill status={status} />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        {[
          { label: "Spindle RPM", value: latest?.spindle_speed ?? "—" },
          { label: "Feedrate", value: latest?.feedrate ?? "—" },
          { label: "Load %", value: latest?.spindle_load ?? "—" },
          { label: "Parts", value: latest?.part_count ?? "—" },
        ].map((s) => (
          <div key={s.label}>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className="font-mono text-lg font-bold text-foreground">
              {typeof s.value === "number" ? Math.round(s.value) : s.value}
            </div>
          </div>
        ))}
      </div>
    </button>
  );
}

function MachinesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const now = useClock();

  useEffect(() => {
    if (!user) { navigate({ to: "/" }); return; }
    const company_id = user.company_id;
    if (!company_id) return;
    getMachines(company_id).then(setMachines).catch(() => setErr("Could not reach the master API at :9000"));
  }, [user, navigate]);

  if (err) {
    return (
      <ErrorPage message={err} onRetry={() => { setErr(null); if (user?.company_id) getMachines(user.company_id).then(setMachines).catch(() => setErr(err)); }} />
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar>
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium text-foreground">
            {user?.company_name || user?.company_id || "Company"}
          </span>
        </div>
      </Navbar>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Select a Machine</h1>
            <p className="mt-1 text-sm text-muted-foreground">Choose a CNC to view its live dashboard</p>
          </div>
          <div className="font-mono text-sm text-muted-foreground">
            {now.toLocaleDateString()} · {now.toLocaleTimeString()}
          </div>
        </div>

        {!machines ? (
          <div className="mt-12 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : machines.length === 0 ? (
          <div className="mt-16 text-center text-muted-foreground">No machines registered for this company.</div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {machines.map((m) => (
              <MachineCard
                key={m.machine_id}
                m={m}
                onClick={() => {
                  sessionStorage.setItem("cnc_selected_machine", JSON.stringify(m));
                  navigate({ to: "/dashboard" });
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function ErrorPage({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-[var(--danger)]" />
        <h2 className="mt-4 text-xl font-bold text-foreground">Backend unreachable</h2>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <button onClick={onRetry} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Retry
        </button>
      </div>
    </div>
  );
}
