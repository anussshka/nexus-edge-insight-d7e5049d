// NexusEdge API client - real backend, no mocks
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

export interface UserSession {
  username: string;
  role: "super_admin" | "company_admin";
  company_id?: string;
  company_name?: string;
}

export interface Machine {
  machine_id: string;
  name: string;
  ip: string;
  api_port: number;
}

export interface Company {
  company_id: string;
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
  last_seen?: string;
  [k: string]: unknown;
}

export interface SummaryData {
  averages?: Record<string, number>;
  maxes?: Record<string, number>;
  total_samples?: number;
  [k: string]: unknown;
}

export interface LayoutCell { cell_index: number; widget_id: string | null; }

export async function login(username: string, password: string, role: "super_admin" | "company_admin"): Promise<UserSession> {
  return request<UserSession>(`${MASTER_API}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ username, password, role }),
  });
}

export async function getCompanies(): Promise<Company[]> {
  return request<Company[]>(`${MASTER_API}/config/companies`);
}

export async function getMachines(company_id: string): Promise<Machine[]> {
  return request<Machine[]>(`${MASTER_API}/config/machines/${company_id}`);
}

export async function getLatest(api_port: number | string): Promise<LatestReading> {
  return request<LatestReading>(`${machineBase(api_port)}/readings/latest`);
}

export async function getHistory(api_port: number | string, column: string, minutes: number) {
  return request<Array<{ timestamp: string; value: number }>>(
    `${machineBase(api_port)}/readings/history?column=${encodeURIComponent(column)}&minutes=${minutes}`
  );
}

export async function getSummary(api_port: number | string): Promise<SummaryData> {
  return request<SummaryData>(`${machineBase(api_port)}/stats/summary`);
}

export async function getLayout(company_id: string, machine_id: string): Promise<LayoutCell[]> {
  return request<LayoutCell[]>(`${MASTER_API}/layout/${company_id}/${machine_id}`);
}

export async function saveLayout(company_id: string, machine_id: string, layout: LayoutCell[]) {
  return request(`${MASTER_API}/layout/${company_id}/${machine_id}`, {
    method: "POST",
    body: JSON.stringify({ layout }),
  });
}

export async function resetLayout(company_id: string, machine_id: string) {
  return request(`${MASTER_API}/layout/${company_id}/${machine_id}`, { method: "DELETE" });
}
