import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg, PageHeader } from "@/components/app-shell";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/assessments/new")({
  component: NewAssessment,
});

const PROFILES = ["Digital", "ERP", "Operating model", "M&A integration", "Regulatory", "Cost optimisation", "Customer experience", "Cloud migration"];
const SCOPES = ["Team", "Function", "Business unit", "Enterprise", "Cross-enterprise"];
const COMPLEXITY = ["Low", "Medium", "High", "Very high"];
const BUSINESS_AREAS = ["Operations", "Finance", "Technology", "People & HR", "Customer", "Supply chain", "Risk & Compliance", "Strategy"];

function NewAssessment() {
  const { user } = useAuth();
  const { data: orgData } = useCurrentOrg();
  const orgId = orgData?.current?.id;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "",
    description: "",
    transformation_profile: "Digital",
    scope_level: "Business unit",
    complexity_level: "Medium",
    business_area: "Operations",
    target_completion_date: "",
    change_owners: "",
    pillar_leads: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error("No organisation");
      const { data: a, error } = await supabase
        .from("assessments")
        .insert({
          organisation_id: orgId,
          name: form.name,
          description: form.description || null,
          transformation_profile: form.transformation_profile,
          scope_level: form.scope_level,
          complexity_level: form.complexity_level,
          business_area: form.business_area,
          target_completion_date: form.target_completion_date || null,
          status: "active",
          created_by: user!.id,
        })
        .select().single();
      if (error) throw error;

      const { data: pillars } = await supabase.from("pillars").select("id").order("display_order");
      if (pillars?.length) {
        await supabase.from("pillar_assessments").insert(pillars.map((p) => ({ assessment_id: a.id, pillar_id: p.id, status: "not_started" as const })));
      }
      await supabase.from("audit_logs").insert({ organisation_id: orgId, assessment_id: a.id, actor_id: user!.id, actor_email: user!.email, event_type: "assessment_created", detail: { note: `Created assessment "${a.name}"` } });
      return a;
    },
    onSuccess: (a) => {
      qc.invalidateQueries({ queryKey: ["assessments"] });
      toast.success("Assessment created. Seven pillar workspaces ready.");
      navigate({ to: "/app/assessments/$id", params: { id: a.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const steps = ["Basics", "Scope & profile", "Owners & leads"];
  const canNext = step === 1 ? !!form.name : step === 2 ? !!form.scope_level && !!form.complexity_level : true;

  return (
    <>
      <PageHeader eyebrow="New assessment" title="Define a transformation assessment" description="Three steps. We will auto-create the seven CORE7 pillar workspaces and load the default questions, evidence prompts and stakeholder groups for your scope." />
      <div className="px-8 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-8">
          {steps.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={cn("h-7 w-7 rounded-full border flex items-center justify-center text-[11px] font-mono", done ? "bg-primary text-primary-foreground border-primary" : active ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                  {done ? <Check className="h-3.5 w-3.5" /> : n}
                </div>
                <span className={cn("text-xs", active ? "font-medium" : "text-muted-foreground")}>{label}</span>
                {n < steps.length && <div className="flex-1 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        <div className="border border-border rounded-sm bg-card p-6 space-y-5">
          {step === 1 && (
            <>
              <div>
                <Label className="text-xs">Assessment name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ERP & Operating Model Modernisation" maxLength={200} />
              </div>
              <div>
                <Label className="text-xs">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="One paragraph the executive sponsor would recognise." maxLength={1000} />
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Transformation profile">
                  <Select value={form.transformation_profile} onValueChange={(v) => setForm({ ...form, transformation_profile: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PROFILES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Business area">
                  <Select value={form.business_area} onValueChange={(v) => setForm({ ...form, business_area: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BUSINESS_AREAS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Scope level">
                  <Select value={form.scope_level} onValueChange={(v) => setForm({ ...form, scope_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SCOPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Complexity">
                  <Select value={form.complexity_level} onValueChange={(v) => setForm({ ...form, complexity_level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPLEXITY.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
              </div>
              <Field label="Target completion date">
                <Input type="date" value={form.target_completion_date} onChange={(e) => setForm({ ...form, target_completion_date: e.target.value })} />
              </Field>
              <p className="text-[11px] text-muted-foreground border-l-2 border-primary pl-3">
                Scope <span className="font-mono">{form.scope_level}</span> · complexity <span className="font-mono">{form.complexity_level}</span> implies proportionate evidence breadth across all seven pillars. You can adjust pillar weights per assessment later.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <Field label="Change Owners">
                <Textarea value={form.change_owners} onChange={(e) => setForm({ ...form, change_owners: e.target.value })} rows={2} placeholder="email1@company.com, email2@company.com" />
                <p className="text-[11px] text-muted-foreground mt-1">Comma-separated emails. Multiple Change Owners supported. We will invite them once team management ships in the next phase.</p>
              </Field>
              <Field label="Initial Pillar Leads">
                <Textarea value={form.pillar_leads} onChange={(e) => setForm({ ...form, pillar_leads: e.target.value })} rows={2} placeholder="lead1@company.com, lead2@company.com" />
                <p className="text-[11px] text-muted-foreground mt-1">Default leads for new pillars. Individual pillars can override.</p>
              </Field>
              <div className="rounded-sm border border-border bg-secondary/40 p-4 text-sm">
                <div className="font-medium mb-1">Ready to create</div>
                <p className="text-muted-foreground text-[13px]">We will create <span className="font-mono text-foreground">"{form.name || "your assessment"}"</span>, generate the seven pillar workspaces with starter questions, and move it to status <span className="font-mono text-foreground">Active</span>.</p>
              </div>
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => step === 1 ? navigate({ to: "/app" }) : setStep(step - 1)}>
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext}>Continue <ChevronRight className="h-3.5 w-3.5" /></Button>
            ) : (
              <Button onClick={() => create.mutate()} disabled={create.isPending}>{create.isPending ? "Creating…" : "Create assessment"}</Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}