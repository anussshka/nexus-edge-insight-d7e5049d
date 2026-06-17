// NexusEdge API client - connected to real FastAPI backend
export const MASTER_API = "http://localhost:9000";
export const machineBase = (api_port: number | string) => `http://localhost:${api_port}`;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

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
  part_count?: number;
  prog_name?: string;
  prog_number?: number | string;
  seq_number?: number | string;
  uptime_seconds?: number;
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

// ── Auth ───────────────────────────────────────────────────────────────────
// YOUR BACKEND expects role as "super" or "sub" not "super_admin"/"company_admin"

export async function login(
  username: string,
  password: string,
  role: "super" | "sub"
): Promise<UserSession> {
  return request<UserSession>(`${MASTER_API}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

// ── Companies & Machines ──────────────────────────────────────────────────
// YOUR BACKEND returns { companies: [...] } not a plain array

export async function getCompanies(): Promise<Company[]> {
  const res = await request<{ companies: Company[] }>(`${MASTER_API}/config/companies`);
  return res.companies;
}

// YOUR BACKEND returns { company: string, machines: [...] } not a plain array

export async function getMachines(company_id: string): Promise<Machine[]> {
  const res = await request<{ company: string; machines: Machine[] }>(
    `${MASTER_API}/config/machines/${company_id}`
  );
  return res.machines;
}

// ── Machine Data ──────────────────────────────────────────────────────────

export async function getLatest(api_port: number | string): Promise<LatestReading> {
  return request<LatestReading>(`${machineBase(api_port)}/readings/latest`);
}

// YOUR BACKEND history URL is /readings/{column}/history?minutes=X
// Lovable generated wrong URL format

export async function getHistory(
  api_port: number | string,
  column: string,
  minutes: number = 10
) {
  return request<Array<{ time: string; value: number }>>(
    `${machineBase(api_port)}/readings/${encodeURIComponent(column)}/history?minutes=${minutes}`
  );
}

// YOUR BACKEND summary returns flat fields not nested averages/maxes object

export async function getSummary(api_port: number | string): Promise<SummaryData> {
  return request<SummaryData>(`${machineBase(api_port)}/stats/summary`);
}

// ── Layout ────────────────────────────────────────────────────────────────
// YOUR BACKEND returns { layout: [...], configured: bool }
// machine_id is a number in your backend

export async function getLayout(
  company_id: string,
  machine_id: string | number
): Promise<LayoutResponse> {
  return request<LayoutResponse>(
    `${MASTER_API}/layout/${company_id}/${machine_id}`
  );
}

export async function saveLayout(
  company_id: string,
  machine_id: string | number,
  layout: LayoutCell[]
) {
  return request(`${MASTER_API}/layout/${company_id}/${machine_id}`, {
    method: "POST",
    body: JSON.stringify({ layout }),
  });
}

export async function resetLayout(
  company_id: string,
  machine_id: string | number
) {
  return request(`${MASTER_API}/layout/${company_id}/${machine_id}`, {
    method: "DELETE",
  });
}
