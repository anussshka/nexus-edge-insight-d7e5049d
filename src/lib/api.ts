// NexusEdge API client — MOCK MODE (no network calls)
// Backend is offline; every function returns hardcoded data matching its types.

export const MASTER_API = "http://mock.local";
export const machineBase = (api_port: number | string) => `http://mock.local:${api_port}`;

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserSession {
  username: string;
  role: "super" | "sub";
  company_id?: string;
  company?: string;
}

export interface Machine {
  id: number;
  name: string;
  ip: string;
  fanuc_port: number;
  api_port: number;
}

export interface Company {
  id: string;
  name: string;
  username: string;
  machines: Machine[];
}

export interface LatestReading {
  status?: string;
  abs_1?: number; abs_2?: number;
  rel_1?: number; rel_2?: number;
  mach_1?: number; mach_2?: number;
  load_1?: number; load_2?: number;
  curr_1?: number; curr_2?: number;
  spindle_speed?: number;
  spindle_load?: number;
  feedrate?: number;
  feedrate_1?: number;
  feedrate_2?: number;
  part_count?: number;
  prog_name?: string;
  prog_number?: number | string;
  seq_number?: number | string;
  uptime_seconds?: number;
  last_seen?: string;
  [k: string]: unknown;
}

export interface SummaryData {
  avg_spindle_speed?: number;
  avg_feedrate?: number;
  max_spindle_load?: number;
  part_count?: number;
  samples?: number;
  [k: string]: unknown;
}

export interface LayoutCell {
  cell_index: number;
  widget_id: string | null;
}

export interface LayoutResponse {
  layout: LayoutCell[];
  configured: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const jitter = (v: number, pct = 0.02) =>
  Math.round((v * (1 + (Math.random() * 2 - 1) * pct)) * 1000) / 1000;

function mockMachines(): Machine[] {
  return [
    { id: 1, name: "VMC-01", ip: "192.168.0.19", fanuc_port: 8193, api_port: 9101 },
    { id: 2, name: "Lathe-02", ip: "192.168.0.20", fanuc_port: 8193, api_port: 9102 },
    { id: 3, name: "VMC-03", ip: "192.168.0.21", fanuc_port: 8193, api_port: 9103 },
  ];
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function login(
  username: string,
  password: string,
  role: "super" | "sub"
): Promise<UserSession> {
  if (role === "super" && username === "admin" && password === "admin123") {
    return Promise.resolve({ username, role: "super" });
  }
  if (role === "sub" && username === "user" && password === "user123") {
    return Promise.resolve({
      username,
      role: "sub",
      company_id: "1",
      company: "Siddharth Enterprise",
    });
  }
  return Promise.reject(new Error("Invalid credentials"));
}

// ── Companies & Machines ──────────────────────────────────────────────────

export async function getCompanies(): Promise<Company[]> {
  const all = mockMachines();
  return Promise.resolve([
    { id: "1", name: "Siddharth Enterprise", username: "user", machines: all },
    { id: "2", name: "Precision Parts Ltd", username: "precision", machines: all.slice(0, 2) },
    { id: "3", name: "MetalWorks Co", username: "metal", machines: all.slice(0, 1) },
  ]);
}

export async function getMachines(_company_id: string): Promise<Machine[]> {
  return Promise.resolve(mockMachines());
}

// ── Machine Data ──────────────────────────────────────────────────────────

export async function getLatest(api_port: number | string): Promise<LatestReading> {
  // Machine 3 (port 9103) is offline
  const port = Number(api_port);
  if (port === 9103) {
    return Promise.reject(new Error("offline"));
  }
  const isIdle = port === 9102;
  return Promise.resolve({
    status: isIdle ? "IDLE" : "RUNNING",
    abs_1: jitter(142.350),
    abs_2: jitter(-28.120),
    rel_1: jitter(0.230),
    rel_2: jitter(-0.050),
    mach_1: jitter(142.580),
    mach_2: jitter(-28.170),
    load_1: Math.round(jitter(42)),
    load_2: Math.round(jitter(28)),
    curr_1: jitter(3.2),
    curr_2: jitter(1.8),
    feedrate: Math.round(jitter(320)),
    feedrate_1: Math.round(jitter(318)),
    feedrate_2: Math.round(jitter(124)),
    spindle_speed: Math.round(jitter(1840)),
    spindle_load: Math.round(jitter(64)),
    part_count: 828,
    prog_name: "OIL SEAL 46 ALUMINIUM",
    prog_number: "O0001",
    seq_number: 120,
    uptime_seconds: 43200,
    last_seen: new Date().toISOString(),
  });
}

export async function getHistory(
  _api_port: number | string,
  column: string,
  _minutes: number = 10
) {
  const base: Record<string, number> = {
    spindle_speed: 1840, spindle_load: 64, feedrate: 320,
    load_1: 42, load_2: 28, curr_1: 3.2, curr_2: 1.8,
    abs_1: 142.35, abs_2: -28.12,
  };
  const b = base[column] ?? 100;
  const now = Date.now();
  const data = Array.from({ length: 30 }, (_, i) => ({
    time: new Date(now - (29 - i) * 2000).toISOString(),
    value: Math.round(jitter(b, 0.05) * 100) / 100,
  }));
  return Promise.resolve(data);
}

export async function getSummary(_api_port: number | string): Promise<SummaryData> {
  return Promise.resolve({
    avg_spindle_speed: 1840,
    avg_feedrate: 320,
    max_spindle_load: 67,
    part_count: 828,
    samples: 14920,
  });
}

// ── Layout ────────────────────────────────────────────────────────────────

const DEFAULT_LAYOUT: LayoutCell[] = [
  { cell_index: 0, widget_id: "abs_pos" },
  { cell_index: 1, widget_id: "rel_pos" },
  { cell_index: 2, widget_id: "mach_pos" },
  { cell_index: 3, widget_id: "spindle_speed" },
  { cell_index: 4, widget_id: "axis_load" },
  { cell_index: 5, widget_id: "axis_feedrate" },
  { cell_index: 6, widget_id: "axis_current" },
  { cell_index: 7, widget_id: "spindle_load" },
  { cell_index: 8, widget_id: "program" },
  { cell_index: 9, widget_id: "part_count" },
  { cell_index: 10, widget_id: null },
  { cell_index: 11, widget_id: null },
  { cell_index: 12, widget_id: null },
  { cell_index: 13, widget_id: null },
  { cell_index: 14, widget_id: null },
  { cell_index: 15, widget_id: null },
];

const layoutStore = new Map<string, LayoutCell[]>();

export async function getLayout(
  company_id: string,
  machine_id: string | number
): Promise<LayoutResponse> {
  const key = `${company_id}:${machine_id}`;
  const saved = layoutStore.get(key);
  return Promise.resolve({
    layout: saved ?? DEFAULT_LAYOUT,
    configured: !!saved || true,
  });
}

export async function saveLayout(
  company_id: string,
  machine_id: string | number,
  layout: LayoutCell[]
) {
  layoutStore.set(`${company_id}:${machine_id}`, layout);
  return Promise.resolve({ ok: true });
}

export async function resetLayout(
  company_id: string,
  machine_id: string | number
) {
  layoutStore.delete(`${company_id}:${machine_id}`);
  return Promise.resolve({ ok: true });
}
