import { Link } from "@tanstack/react-router";
import { LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/lib/auth";
import { useState, useRef, useEffect } from "react";

export function Navbar({ children }: { children?: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const initials = (user?.username || "U").slice(0, 2).toUpperCase();
  const isSuper = user?.role === "super_admin";

  return (
    <nav className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-6">
      <Link to="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Settings className="h-5 w-5" />
        </div>
        <span className="text-lg font-bold tracking-tight">NexusEdge</span>
      </Link>
      <div className="flex-1">{children}</div>
      {isSuper && (
        <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">SuperAdmin</span>
      )}
      <ThemeToggle />
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground"
        >
          {initials}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card p-2 shadow-lg">
            <div className="px-3 py-2 text-xs text-muted-foreground">Signed in as</div>
            <div className="px-3 pb-2 text-sm font-semibold">{user?.username}</div>
            <button
              onClick={() => { logout(); window.location.href = "/"; }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
