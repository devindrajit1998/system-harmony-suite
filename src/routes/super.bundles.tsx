import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ModulePicker, PriceSummary } from "@/components/ModulePicker";
import { PageHeader } from "@/components/shell/PortalShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_TERMS, ENTITY_MAP } from "@/data/catalog";
import type { BundleDef } from "@/data/types";
import { iconFor } from "@/lib/icons";
import { monthlyPrice } from "@/lib/rules";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/super/bundles")({ component: BundlesPage });

function BundlesPage() {
  const bundles = useAppStore((s) => s.bundles);
  const modules = useAppStore((s) => s.modules);
  const save = useAppStore((s) => s.saveBundle);
  const del = useAppStore((s) => s.deleteBundle);
  const log = useAppStore((s) => s.log);
  const [sel, setSel] = useState(bundles[0]?.key);
  const [draft, setDraft] = useState<BundleDef>(() => structuredClone(bundles[0]));
  const [isNew, setIsNew] = useState(false);

  const choose = (b: BundleDef) => { setSel(b.key); setDraft(structuredClone(b)); setIsNew(false); };
  const entities = [...new Set(draft.modules.map((k) => modules.find((m) => m.key === k)?.entity).filter(Boolean) as string[])];
  const price = monthlyPrice({ moduleKeys: draft.modules, modules, bundle: draft.key === "custom" ? "custom" : "x" });

  const submit = () => {
    if (!draft.name.trim()) return toast.error("Bundle needs a name");
    const key = isNew ? draft.name.toLowerCase().replace(/[^a-z0-9]+/g, "_") : draft.key;
    save({ ...draft, key }, isNew ? undefined : sel);
    log("Super Admin", isNew ? "created bundle" : "updated bundle", draft.name);
    setSel(key); setIsNew(false);
    toast.success("Bundle saved");
  };

  return (
    <div>
      <PageHeader title="Bundle builder" description="Presets of modules, terminology and default fields." actions={
        <Button onClick={() => { setIsNew(true); setSel(""); setDraft({ key: "", name: "", icon: "Puzzle", description: "", modules: ["customers"], terms: {}, defaultFields: {} }); }}><Plus className="h-4 w-4" /> New bundle</Button>
      } />
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-1">
          {bundles.map((b) => { const I = iconFor(b.icon); return (
            <button key={b.key} onClick={() => choose(b)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition", sel === b.key ? "bg-card font-medium shadow-sm ring-1 ring-border" : "hover:bg-muted")}>
              <I className="h-4 w-4" /><span className="flex-1">{b.name}</span><span className="text-xs text-muted-foreground">{b.modules.length}</span>
            </button>
          ); })}
        </div>
        <div className="space-y-6">
          <p className="rounded-lg border border-dashed bg-muted/50 px-3 py-2 text-sm text-muted-foreground">Changes apply to new tenants only. Existing tenants keep the setup they started with.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Description</Label><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
          </div>
          <section>
            <h3 className="mb-3 font-semibold">Modules</h3>
            <ModulePicker modules={modules} enabled={draft.modules} onChange={(next) => setDraft({ ...draft, modules: next })} />
          </section>
          <div className="grid gap-6 xl:grid-cols-2">
            <section>
              <h3 className="mb-3 font-semibold">Terminology overrides</h3>
              <div className="space-y-2 rounded-xl border bg-card p-4">
                {entities.map((e) => (
                  <div key={e} className="grid grid-cols-2 items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{DEFAULT_TERMS[e]}</span>
                    <Input value={draft.terms[e] ?? ""} placeholder={DEFAULT_TERMS[e]} onChange={(ev) => setDraft({ ...draft, terms: { ...draft.terms, [e]: ev.target.value } })} />
                  </div>
                ))}
              </div>
            </section>
            <section>
              <h3 className="mb-3 font-semibold">Default optional fields</h3>
              <div className="space-y-4 rounded-xl border bg-card p-4">
                {entities.map((e) => {
                  const opts = ENTITY_MAP[e].fields.filter((f) => f.tier === "module");
                  if (!opts.length) return null;
                  const on = draft.defaultFields[e] ?? [];
                  return (
                    <div key={e}>
                      <div className="mb-2 text-sm font-medium">{draft.terms[e] || DEFAULT_TERMS[e]}</div>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {opts.map((f) => (
                          <label key={f.key} className="flex items-center gap-1.5 text-sm">
                            <Checkbox checked={on.includes(f.key)} onCheckedChange={(c) => setDraft({ ...draft, defaultFields: { ...draft.defaultFields, [e]: c ? [...on, f.key] : on.filter((x) => x !== f.key) } })} />{f.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full max-w-xs"><PriceSummary price={price} label="Modules / month" /></div>
            <Button onClick={submit}>Save bundle</Button>
            {!isNew && draft.key !== "custom" && (
              <Button variant="ghost" className="text-destructive" onClick={() => { del(draft.key); log("Super Admin", "deleted bundle", draft.name); choose(bundles[0]); toast.success("Bundle deleted"); }}><Trash2 className="h-4 w-4" /> Delete</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
