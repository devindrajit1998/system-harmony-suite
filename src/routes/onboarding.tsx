import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Mail, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ModulePicker, PriceSummary } from "@/components/ModulePicker";
import { TopBar } from "@/components/shell/TopBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_TERMS } from "@/data/catalog";
import { defaultFieldSettings, defaultRoles, uid } from "@/data/seed";
import type { FieldSetting, Tenant } from "@/data/types";
import { resolveFields } from "@/hooks/use-tenant";
import { iconFor } from "@/lib/icons";
import { monthlyPrice, plural } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/onboarding")({
  validateSearch: (s: Record<string, unknown>) => ({ tenant: typeof s.tenant === "string" ? s.tenant : undefined }),
  head: () => ({
    meta: [
      { title: "Set up a business — Modulo" },
      { name: "description", content: "Five quick steps: business type, modules, fields, terminology and team." },
      { property: "og:title", content: "Set up a business — Modulo" },
      { property: "og:description", content: "Launch a new tenant workspace in five steps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Business", "Modules", "Fields", "Team & words", "Summary"];
const COLORS = ["#E4572E", "#0E9F8E", "#D9467A", "#9A6B3F", "#3563E9", "#2F855A", "#B7791F"];

function Onboarding() {
  const { tenant: existingId } = Route.useSearch();
  const s = useAppStore();
  const navigate = useNavigate();
  const existing = s.tenants.find((t) => t.id === existingId);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Tenant>(() =>
    existing ? structuredClone(existing) : {
      id: "", name: "", bundle: "gym", plan: "starter", color: COLORS[5], currency: "USD", status: "trial",
      signupDate: new Date().toISOString().slice(0, 10), modules: [...s.bundles[0].modules], terms: { ...s.bundles[0].terms },
      fieldSettings: defaultFieldSettings("gym"), customFields: {}, roles: [],
    });
  const [invites, setInvites] = useState<string[]>([]);
  const [email, setEmail] = useState("");

  const pickBundle = (key: string) => {
    const b = s.bundles.find((x) => x.key === key)!;
    const fs = defaultFieldSettings(key);
    for (const [e, keys] of Object.entries(b.defaultFields)) for (const k of keys) fs[e] ??= {}, fs[e][k] = { enabled: true, required: false };
    setDraft({ ...draft, bundle: key, modules: [...b.modules], terms: { ...b.terms }, fieldSettings: fs });
  };
  const price = monthlyPrice({ plan: s.plans.find((p) => p.key === draft.plan), moduleKeys: draft.modules, modules: s.modules, bundle: draft.bundle });
  const entities = useMemo(() => [...new Set(draft.modules.map((k) => s.modules.find((m) => m.key === k)?.entity).filter(Boolean) as string[])], [draft.modules, s.modules]);
  const setField = (e: string, k: string, p: Partial<FieldSetting>) => setDraft((d) => {
    const cur = d.fieldSettings[e]?.[k] ?? { enabled: true, required: false };
    const next = { ...cur, ...p };
    if (p.enabled === false) next.required = false;
    if (p.required) next.enabled = true;
    return { ...d, fieldSettings: { ...d.fieldSettings, [e]: { ...d.fieldSettings[e], [k]: next } } };
  });

  const canNext = step !== 0 || draft.name.trim().length > 1;
  const finish = () => {
    const id = existing?.id ?? (draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tenant") + "-" + uid().slice(0, 4);
    const t: Tenant = { ...draft, id, roles: existing?.roles.length ? existing.roles : defaultRoles(draft.bundle, draft.modules) };
    if (existing) s.updateTenant(id, (x) => Object.assign(x, t)); else s.addTenant(t);
    s.log(existing ? draft.name : "Super Admin", existing ? "re-ran onboarding" : "created tenant", draft.name);
    s.setTenant(id);
    toast.success(existing ? "Workspace updated" : `${draft.name} is ready`, { description: invites.length ? `${invites.length} invite(s) sent (demo)` : undefined });
    navigate({ to: "/app" });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full flex-col">
        <div className="[&_[data-sidebar=trigger]]:hidden"><TopBar portal="super" /></div>
        <main className="mx-auto w-full max-w-5xl flex-1 p-4 md:p-8">
          <h1 className="text-3xl font-bold">{existing ? `Restart onboarding for ${existing.name}` : "Set up a new business"}</h1>
          <ol className="mt-6 flex flex-wrap gap-2">
            {STEPS.map((l, i) => (
              <li key={l} className={cn("flex items-center gap-2 rounded-full border px-3 py-1 text-sm", i === step ? "border-primary bg-primary text-primary-foreground" : i < step ? "bg-muted" : "text-muted-foreground")}>
                <span className="font-display font-bold">{i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}</span>{l}
              </li>
            ))}
          </ol>

          <section className="mt-8 min-h-[360px]">
            {step === 0 && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-2"><Label>Business name</Label><Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Sunrise Yoga Studio" /></div>
                  <div className="space-y-1.5"><Label>Currency</Label>
                    <Select value={draft.currency} onValueChange={(v) => setDraft({ ...draft, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["USD", "EUR", "GBP", "INR", "AUD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                  </div>
                </div>
                <div><Label>Business type</Label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-3">
                    {s.bundles.map((b) => { const I = iconFor(b.icon); return (
                      <button key={b.key} onClick={() => pickBundle(b.key)} className={cn("rounded-xl border bg-card p-4 text-left transition", draft.bundle === b.key ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40")}>
                        <I className="h-6 w-6" /><div className="mt-2 font-semibold">{b.name}</div><div className="text-xs text-muted-foreground">{b.description}</div>
                      </button>
                    ); })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-6">
                  <div><Label>Brand color</Label><div className="mt-2 flex gap-2">{COLORS.map((c) => <button key={c} onClick={() => setDraft({ ...draft, color: c })} aria-label={`Color ${c}`} className={cn("h-8 w-8 rounded-full ring-offset-2 ring-offset-background", draft.color === c && "ring-2 ring-foreground")} style={{ background: c }} />)}</div></div>
                  <div><Label>Plan</Label><Select value={draft.plan} onValueChange={(v) => setDraft({ ...draft, plan: v })}><SelectTrigger className="mt-2 w-44"><SelectValue /></SelectTrigger><SelectContent>{s.plans.map((p) => <SelectItem key={p.key} value={p.key}>{p.name} — ${p.price}</SelectItem>)}</SelectContent></Select></div>
                </div>
              </div>
            )}
            {step === 1 && (
              <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                <ModulePicker modules={s.modules} enabled={draft.modules} compact onChange={(next) => setDraft({ ...draft, modules: next })} />
                <div className="lg:sticky lg:top-20 lg:self-start"><PriceSummary price={price} /></div>
              </div>
            )}
            {step === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                {entities.map((e) => (
                  <div key={e} className="rounded-xl border bg-card p-4">
                    <h3 className="mb-3 font-semibold">{plural(draft.terms[e] || DEFAULT_TERMS[e])}</h3>
                    <div className="space-y-2">
                      {resolveFields(draft, e, true).map((f) => (
                        <div key={f.key} className="flex items-center justify-between text-sm">
                          <span className={cn(!f.enabled && "text-muted-foreground")}>{f.label}</span>
                          {f.tier === "system" ? <span className="text-xs text-muted-foreground">Always on</span> : (
                            <div className="flex gap-3 text-xs">
                              <label className="flex items-center gap-1">On<Switch checked={f.enabled} onCheckedChange={(v) => setField(e, f.key, { enabled: v })} /></label>
                              <label className="flex items-center gap-1">Req.<Switch checked={f.required} onCheckedChange={(v) => setField(e, f.key, { required: v })} /></label>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {step === 3 && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="mb-3 font-semibold">What do you call them?</h3>
                  <div className="space-y-2">
                    {entities.map((e) => (
                      <div key={e} className="grid grid-cols-2 items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{DEFAULT_TERMS[e]}</span>
                        <Input value={draft.terms[e] ?? ""} placeholder={DEFAULT_TERMS[e]} onChange={(ev) => setDraft({ ...draft, terms: { ...draft.terms, [e]: ev.target.value } })} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <h3 className="mb-3 font-semibold">Invite your team</h3>
                  <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (/\S+@\S+\.\S+/.test(email)) { setInvites([...invites, email]); setEmail(""); } else toast.error("Enter a valid email"); }}>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@business.com" />
                    <Button type="submit" variant="outline"><Mail className="h-4 w-4" /> Invite</Button>
                  </form>
                  <ul className="mt-3 space-y-1 text-sm">
                    {invites.map((i) => <li key={i} className="flex items-center justify-between rounded-md bg-muted px-3 py-1.5">{i}<button onClick={() => setInvites(invites.filter((x) => x !== i))} aria-label="Remove"><X className="h-3.5 w-3.5" /></button></li>)}
                    {!invites.length && <li className="text-muted-foreground">No invites yet — you can skip this.</li>}
                  </ul>
                </div>
              </div>
            )}
            {step === 4 && (
              <div className="grid gap-6 md:grid-cols-[1fr_300px]">
                <div className="space-y-3 rounded-xl border bg-card p-5 text-sm">
                  <div className="flex items-center gap-3"><span className="h-10 w-10 rounded-lg" style={{ background: draft.color }} /><div><div className="text-lg font-semibold">{draft.name}</div><div className="text-muted-foreground">{s.bundles.find((b) => b.key === draft.bundle)?.name} · {draft.plan} · {draft.currency}</div></div></div>
                  <div><span className="text-muted-foreground">Modules:</span> {draft.modules.map((k) => s.modules.find((m) => m.key === k)?.name).join(", ")}</div>
                  <div><span className="text-muted-foreground">Terms:</span> {entities.map((e) => draft.terms[e] || DEFAULT_TERMS[e]).join(", ")}</div>
                  <div><span className="text-muted-foreground">Invites:</span> {invites.length || "none"}</div>
                </div>
                <PriceSummary price={price} />
              </div>
            )}
          </section>

          <div className="mt-8 flex justify-between border-t pt-6">
            <Button variant="ghost" onClick={() => (step === 0 ? navigate({ to: existing ? "/app" : "/super/tenants" }) : setStep(step - 1))}><ArrowLeft className="h-4 w-4" /> {step === 0 ? "Cancel" : "Back"}</Button>
            {step < 4 ? <Button disabled={!canNext} onClick={() => setStep(step + 1)}>Continue <ArrowRight className="h-4 w-4" /></Button> : <Button onClick={finish}><Check className="h-4 w-4" /> {existing ? "Save & open dashboard" : "Create & open dashboard"}</Button>}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
