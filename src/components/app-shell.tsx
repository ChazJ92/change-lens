import { useState } from "react";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Settings,
  ChevronDown,
  LogOut,
  Sparkles,
  Plus,
  Search,
  ShieldCheck,
  FileBarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wordmark } from "@/components/brand";

const NAV = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/app", label: "Assessments", icon: ClipboardList },
  { to: "/app/reviews", label: "Reviewer queue", icon: ShieldCheck },
];

export function useCurrentOrg() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["current-org", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const supabase = await getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("memberships")
        .select("organisation_id, role, organisations(id, name, is_demo)")
        .order("role", { ascending: true });
      if (error) throw error;
      const orgs = (data ?? [])
        .map((m: any) => ({ ...m.organisations, role: m.role }))
        .filter(Boolean);
      const preferred =
        orgs.find((o: any) => !o.is_demo) ?? orgs[0] ?? null;
      const stored = typeof window !== "undefined" ? localStorage.getItem("core7.org") : null;
      const current = orgs.find((o: any) => o.id === stored) ?? preferred;
      return { orgs, current };
    },
  });
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data } = useCurrentOrg();
  const navigate = useNavigate();
  const location = useLocation();
  const [orgMenu, setOrgMenu] = useState(false);

  const orgs = data?.orgs ?? [];
  const current = data?.current;

  async function signOut() {
    const supabase = await getSupabaseBrowserClient();
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  function pickOrg(id: string) {
    localStorage.setItem("core7.org", id);
    window.location.reload();
  }

  const initial = (user?.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside
        className="w-60 shrink-0 hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border"
      >
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Wordmark size="sm" tone="inverse" withFramework />
        </div>

        <DropdownMenu open={orgMenu} onOpenChange={setOrgMenu}>
          <DropdownMenuTrigger asChild>
            <button className="mx-3 mt-3 px-3 py-2.5 rounded-sm border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent text-left flex items-center justify-between gap-2 cursor-pointer transition-colors">
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-sidebar-foreground/60">Organisation</div>
                <div className="text-sm font-medium truncate text-sidebar-foreground">{current?.name ?? "Loading…"}</div>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider">Switch organisation</DropdownMenuLabel>
            {orgs.map((o: any) => (
              <DropdownMenuItem key={o.id} onClick={() => pickOrg(o.id)} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm">{o.name}</div>
                  <div className="text-[11px] text-muted-foreground">{o.is_demo ? "Demo workspace" : o.role}</div>
                </div>
                {current?.id === o.id && <span className="text-[10px] font-mono uppercase text-primary">Current</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <nav className="px-2 mt-4 flex-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-sm text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground font-medium border-l-2 border-primary pl-[10px]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border px-3 py-3 text-[11px] text-sidebar-foreground/60 space-y-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span>AI not configured</span>
          </div>
          <p className="leading-snug">Configure your own OpenAI key in admin to enable AI analysis. The platform works fully without it.</p>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 gap-4">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search assessments, pillars, evidence…" className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0" />
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="h-8">
              <Link to="/app/assessments/new"><Plus className="h-3.5 w-3.5" /> New assessment</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-8 w-8 rounded-full bg-secondary border border-border text-sm font-medium flex items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="text-xs">
                  <div className="font-medium">{user?.user_metadata?.full_name ?? "User"}</div>
                  <div className="text-muted-foreground font-normal">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/app/settings/ai"><Sparkles className="h-4 w-4 mr-2" /> AI settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem disabled><Users className="h-4 w-4 mr-2" /> Team (coming)</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}><LogOut className="h-4 w-4 mr-2" /> Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-border bg-card">
      <div className="px-8 py-6 max-w-[1400px]">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground mb-2">{eyebrow}</div>
            )}
            <h1 className="display text-[28px] leading-[1.1] tracking-[-0.018em]" style={{ color: "var(--ink)" }}>{title}</h1>
            {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

export function StatusChip({ label, tone = "muted" }: { label: string; tone?: string }) {
  const toneStyle: Record<string, string> = {
    success: "bg-[color-mix(in_oklab,var(--success)_14%,transparent)] text-[var(--success)] border-[color-mix(in_oklab,var(--success)_30%,transparent)]",
    warning: "bg-[color-mix(in_oklab,var(--warning)_14%,transparent)] text-[var(--warning)] border-[color-mix(in_oklab,var(--warning)_30%,transparent)]",
    danger: "bg-[color-mix(in_oklab,var(--destructive)_14%,transparent)] text-[var(--destructive)] border-[color-mix(in_oklab,var(--destructive)_30%,transparent)]",
    info: "bg-[color-mix(in_oklab,var(--info)_14%,transparent)] text-[var(--info)] border-[color-mix(in_oklab,var(--info)_30%,transparent)]",
    primary: "bg-[color-mix(in_oklab,var(--primary)_12%,transparent)] text-primary border-[color-mix(in_oklab,var(--primary)_30%,transparent)]",
    muted: "bg-secondary text-muted-foreground border-border",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[11px] font-medium border", toneStyle[tone] ?? toneStyle.muted)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}