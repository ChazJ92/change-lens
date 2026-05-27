import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wordmark } from "@/components/brand";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — ChangeLens" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/app" });
  }, [user, loading, navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = await getSupabaseBrowserClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/app",
            data: { full_name: fullName, organisation_name: orgName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email if confirmation is required.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    try {
      const { lovable } = await import("@/integrations/lovable");
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/app" });
      if (result.error) throw result.error;
    } catch (err: any) {
      toast.error(err.message ?? "Google sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground grid md:grid-cols-2">
      <aside className="hidden md:flex flex-col justify-between border-r border-border bg-card p-12">
        <Link to="/"><Wordmark size="sm" /></Link>
        <div>
          <p className="eyebrow mb-4">Strategic assurance for transformation</p>
          <h2 className="display text-[34px] leading-[1.1] tracking-tight max-w-md" style={{ color: "var(--ink)" }}>
            Evidence-led readiness for complex change.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground max-w-md">
            ChangeLens scores readiness across the seven CORE7 domains, governs every decision with mandatory human review, and keeps a full audit trail from evidence to boardroom score.
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.18em]">© ChangeLens · Powered by the CORE7 framework</p>
      </aside>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--ink)" }}>
            {mode === "signin" ? "Sign in" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin" ? "Welcome back. Continue to your workspace." : "Spin up a personal workspace and explore the demo."}
          </p>

          <Button type="button" variant="outline" className="mt-6 w-full" onClick={handleGoogle} disabled={busy}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.5 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h5.9a5 5 0 0 1-2.18 3.28v2.72h3.52c2.06-1.9 3.26-4.7 3.26-8.24z" />
              <path fill="#34A853" d="M12 23c2.94 0 5.4-.98 7.2-2.66l-3.52-2.72c-.98.66-2.23 1.05-3.68 1.05-2.83 0-5.22-1.9-6.08-4.47H2.3v2.8A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.92 14.2A6.6 6.6 0 0 1 5.55 12c0-.76.13-1.5.37-2.2V7H2.3a11 11 0 0 0 0 10l3.62-2.8z" />
              <path fill="#EA4335" d="M12 5.38c1.6 0 3.04.55 4.17 1.62l3.12-3.12C17.4 2.1 14.94 1 12 1A11 11 0 0 0 2.3 7l3.62 2.8C6.78 7.27 9.17 5.38 12 5.38z" />
            </svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="flex-1 h-px bg-border" /> or email <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="full" className="text-xs">Full name</Label>
                  <Input id="full" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={120} />
                </div>
                <div>
                  <Label htmlFor="org" className="text-xs">Organisation name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Defaults to your workspace" maxLength={120} />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email" className="text-xs">Work email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="pw" className="text-xs">Password</Label>
              <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>No account? <button type="button" className="text-primary hover:underline cursor-pointer" onClick={() => setMode("signup")}>Create one</button>.</>
            ) : (
              <>Already have one? <button type="button" className="text-primary hover:underline cursor-pointer" onClick={() => setMode("signin")}>Sign in</button>.</>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}