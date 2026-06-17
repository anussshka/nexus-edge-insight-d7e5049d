import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Settings, Activity, Grid3x3, Lock, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { login } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — NexusEdge" },
      { name: "description", content: "Sign in to NexusEdge to monitor your FANUC CNC machines." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [role, setRole] = useState<"super" | "sub">("sub");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!username || !password) { setErr("Username and password are required"); return; }
    setLoading(true);
    try {
      const user = await login(username, password, role);
      setUser(user);
      navigate({ to: user.role === "super_admin" ? "/admin" : "/machines" });
    } catch {
      setErr("Invalid credentials or backend unreachable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className="hidden w-[280px] flex-col justify-between p-10 text-white md:flex"
        style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #0f172a 100%)" }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Settings className="h-7 w-7" />
            </div>
            <span className="text-2xl font-bold tracking-tight">NexusEdge</span>
          </div>
          <p className="mt-12 text-2xl font-semibold leading-snug text-white/90">
            Real-time intelligence for industrial machines
          </p>
          <ul className="mt-12 space-y-5 text-sm text-white/75">
            <li className="flex items-start gap-3">
              <Activity className="mt-0.5 h-5 w-5 text-[#3b82f6]" />
              <span>Live FANUC FOCAS2 data</span>
            </li>
            <li className="flex items-start gap-3">
              <Grid3x3 className="mt-0.5 h-5 w-5 text-[#3b82f6]" />
              <span>Multi-machine monitoring</span>
            </li>
            <li className="flex items-start gap-3">
              <Lock className="mt-0.5 h-5 w-5 text-[#3b82f6]" />
              <span>Role-based access control</span>
            </li>
          </ul>
        </div>
        <div className="font-mono text-xs text-white/40">v1.0 · FOCAS2</div>
      </aside>

      {/* Form */}
      <main className="relative flex flex-1 items-center justify-center px-6 py-10 sm:px-16">
        <div className="absolute right-6 top-6"><ThemeToggle /></div>
        <form onSubmit={submit} className="w-full max-w-2xl">
          <h1 className="text-5xl font-bold tracking-tight text-foreground">Sign in</h1>
          <p className="mt-3 text-lg text-muted-foreground">Access your CNC dashboard</p>

          <div className="mt-10 grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted p-1.5">
            {(["super_admin", "company_admin"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-lg py-4 text-base font-semibold transition-all ${
                  role === r
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === "super_admin" ? "Super Admin" : "Company Admin"}
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-xl border border-border bg-card px-5 py-4 text-base text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-border bg-card px-5 py-4 text-base text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/30"
                placeholder="Enter your password"
              />
              {err && <p className="mt-2 text-sm font-medium text-[var(--danger)]">{err}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl text-base font-semibold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-70"
            style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
          </button>

          <div className="mt-8 rounded-xl border border-border bg-muted p-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demo Credentials</div>
            <pre className="font-mono text-xs leading-relaxed text-foreground">
{`Super Admin   →  superadmin / super123
Company Admin →  siddharth  / sid123`}
            </pre>
          </div>
        </form>
      </main>
    </div>
  );
}
