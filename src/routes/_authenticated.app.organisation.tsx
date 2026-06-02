import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, PencilLine, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, StatusChip, useCurrentOrg } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mockRepositories as repo } from "@/lib/mock";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app/organisation")({
  component: OrganisationPage,
});

function OrganisationPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: orgData } = useCurrentOrg();
  const currentOrgId = orgData?.current?.id;

  const { data: organisation, isLoading } = useQuery({
    queryKey: ["organisation-profile", currentOrgId],
    enabled: !!currentOrgId,
    queryFn: async () => {
      const org = repo.organisations.get(currentOrgId!);
      if (!org) throw new Error("Organisation not found");
      return org;
    },
  });

  const { data: canManage } = useQuery({
    queryKey: ["organisation-admin", user?.id, currentOrgId],
    enabled: !!user?.id && !!currentOrgId,
    queryFn: async () => repo.organisations.isAdmin(currentOrgId!, user!.id),
  });

  const [form, setForm] = useState({
    name: "",
    sector: "",
    employee_count: "",
    change_population: "",
    countries_operated: "",
    summary: "",
  });

  const [newOrg, setNewOrg] = useState({
    name: "",
    sector: "",
    employee_count: "",
    change_population: "",
    countries_operated: "",
    summary: "",
  });

  useEffect(() => {
    if (!organisation) return;
    setForm({
      name: organisation.name ?? "",
      sector: organisation.sector ?? "",
      employee_count: toInput(organisation.employee_count),
      change_population: toInput(organisation.change_population),
      countries_operated: toInput(organisation.countries_operated),
      summary: organisation.summary ?? "",
    });
  }, [organisation]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      if (!currentOrgId) throw new Error("No organisation selected");
      if (!repo.organisations.isAdmin(currentOrgId, user!.id)) {
        throw new Error("You need admin access to edit this organisation");
      }
      const payload = {
        name: form.name.trim(),
        sector: emptyToNull(form.sector),
        employee_count: toNullableInt(form.employee_count),
        change_population: toNullableInt(form.change_population),
        countries_operated: toNullableInt(form.countries_operated),
        summary: emptyToNull(form.summary),
      };
      if (!payload.name) throw new Error("Organisation name is required");

      repo.organisations.update(currentOrgId, payload);
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["organisation-profile"] }),
        qc.invalidateQueries({ queryKey: ["current-org"] }),
      ]);
      toast.success("Organisation profile saved.");
    },
    onError: (error: any) => toast.error(error.message ?? "Could not save organisation profile"),
  });

  const createOrg = useMutation({
    mutationFn: async () => {
      const name = newOrg.name.trim();
      if (!name) throw new Error("Organisation name is required");
      const org = repo.organisations.createWithMembership(
        {
          name,
          sector: emptyToNull(newOrg.sector),
          employee_count: toNullableInt(newOrg.employee_count),
          change_population: toNullableInt(newOrg.change_population),
          countries_operated: toNullableInt(newOrg.countries_operated),
          summary: emptyToNull(newOrg.summary),
        },
        user!.id,
      );
      return org.id;
    },
    onSuccess: async (orgId) => {
      localStorage.setItem("core7.org", orgId);
      await qc.invalidateQueries({ queryKey: ["current-org"] });
      toast.success("Organisation created. Switched to the new workspace.");
      window.location.reload();
    },
    onError: (error: any) => toast.error(error.message ?? "Could not create organisation"),
  });

  return (
    <>
      <PageHeader
        eyebrow="Organisation context"
        title="Manage organisation profile"
        description="Capture the scale and operating context that should shape recommendations, sequencing and evidence expectations."
      />
      <div className="px-8 py-8 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
        <section className="rounded-sm border border-border bg-card">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">Current organisation</h2>
                {organisation?.is_demo && <StatusChip label="Demo workspace" tone="warning" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                This profile should reflect the real operating environment. A 100-person rollout and a 100,000-person rollout should not generate the same next actions.
              </p>
            </div>
            <StatusChip label={canManage ? "Admin access" : "View only"} tone={canManage ? "primary" : "muted"} />
          </div>

          <div className="px-6 py-6 space-y-5">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading organisation profile…</p>
            ) : (
              <>
                <Field label="Organisation name">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={120}
                    disabled={!canManage}
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Sector / industry">
                    <Input
                      value={form.sector}
                      onChange={(e) => setForm({ ...form, sector: e.target.value })}
                      placeholder="e.g. Public sector, Manufacturing, Banking"
                      maxLength={120}
                      disabled={!canManage}
                    />
                  </Field>
                  <Field label="Employees">
                    <Input
                      inputMode="numeric"
                      value={form.employee_count}
                      onChange={(e) => setForm({ ...form, employee_count: digitsOnly(e.target.value) })}
                      placeholder="e.g. 100000"
                      disabled={!canManage}
                    />
                  </Field>
                  <Field label="Change population">
                    <Input
                      inputMode="numeric"
                      value={form.change_population}
                      onChange={(e) => setForm({ ...form, change_population: digitsOnly(e.target.value) })}
                      placeholder="People directly impacted"
                      disabled={!canManage}
                    />
                  </Field>
                  <Field label="Countries operated">
                    <Input
                      inputMode="numeric"
                      value={form.countries_operated}
                      onChange={(e) => setForm({ ...form, countries_operated: digitsOnly(e.target.value) })}
                      placeholder="e.g. 12"
                      disabled={!canManage}
                    />
                  </Field>
                </div>

                <Field label="Transformation context">
                  <Textarea
                    value={form.summary}
                    onChange={(e) => setForm({ ...form, summary: e.target.value })}
                    rows={6}
                    maxLength={1500}
                    placeholder="Describe the operating environment, pace of change, union or regulatory constraints, regional complexity, recent transformations, or anything else that should change how recommendations are framed."
                    disabled={!canManage}
                  />
                </Field>

                <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
                  <p className="text-xs text-muted-foreground">
                    These fields are intended to drive more proportionate recommendations and evidence expectations across assessments.
                  </p>
                  <Button onClick={() => saveProfile.mutate()} disabled={!canManage || saveProfile.isPending}>
                    <PencilLine className="h-4 w-4" />
                    {saveProfile.isPending ? "Saving…" : "Save profile"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="rounded-sm border border-border bg-card">
          <div className="border-b border-border px-6 py-5">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <h2 className="text-lg font-semibold">Add another organisation</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a separate organisation workspace when you need a different operating context, team, or portfolio of assessments.
            </p>
          </div>

          <div className="px-6 py-6 space-y-4">
            <Field label="Organisation name">
              <Input
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                maxLength={120}
                placeholder="e.g. EMEA Shared Services"
              />
            </Field>
            <Field label="Sector / industry">
              <Input
                value={newOrg.sector}
                onChange={(e) => setNewOrg({ ...newOrg, sector: e.target.value })}
                maxLength={120}
                placeholder="Optional"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Employees">
                <Input
                  inputMode="numeric"
                  value={newOrg.employee_count}
                  onChange={(e) => setNewOrg({ ...newOrg, employee_count: digitsOnly(e.target.value) })}
                />
              </Field>
              <Field label="Change population">
                <Input
                  inputMode="numeric"
                  value={newOrg.change_population}
                  onChange={(e) => setNewOrg({ ...newOrg, change_population: digitsOnly(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Countries operated">
              <Input
                inputMode="numeric"
                value={newOrg.countries_operated}
                onChange={(e) => setNewOrg({ ...newOrg, countries_operated: digitsOnly(e.target.value) })}
              />
            </Field>
            <Field label="Transformation context">
              <Textarea
                value={newOrg.summary}
                onChange={(e) => setNewOrg({ ...newOrg, summary: e.target.value })}
                rows={5}
                maxLength={1500}
                placeholder="Optional context for future recommendations and assessment framing."
              />
            </Field>
            <Button className="w-full" onClick={() => createOrg.mutate()} disabled={createOrg.isPending}>
              <Plus className="h-4 w-4" />
              {createOrg.isPending ? "Creating…" : "Create organisation"}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNullableInt(value: string) {
  if (!value.trim()) return null;
  return Number.parseInt(value, 10);
}

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function toInput(value: number | null) {
  return value == null ? "" : String(value);
}
