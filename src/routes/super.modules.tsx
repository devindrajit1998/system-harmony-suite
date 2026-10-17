import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { ModuleDef } from "@/data/types";
import { ICON_CHOICES, iconFor } from "@/lib/icons";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/super/modules")({ head: () => pageHead('Module catalog', 'Manage modules, dependencies and tenant usage.'), component: ModulesPage });

const blank: ModuleDef = { key: "", name: "", icon: "Box", description: "", dependsOn: [], price: 0, status: "beta" };

function ModulesPage() {
  const modules = useAppStore((s) => s.modules);
  const tenants = useAppStore((s) => s.tenants);
  const save = useAppStore((s) => s.saveModule);
  const log = useAppStore((s) => s.log);
  const [edit, setEdit] = useState<{ m: ModuleDef; orig?: string } | null>(null);

  const submit = () => {
    if (!edit) return;
    const m = { ...edit.m, key: edit.m.key.trim().toLowerCase().replace(/\s+/g, "_") };
    if (!m.key || !m.name) return toast.error("Key and name are required");
    if (!edit.orig && modules.some((x) => x.key === m.key)) return toast.error("That key already exists");
    save(m, edit.orig);
    log("Super Admin", edit.orig ? "updated module" : "created module", m.name);
    toast.success(`Module "${m.name}" saved`);
    setEdit(null);
  };

  return (
    <div>
      <PageHeader title="Module catalog" description="Feature packages tenants can switch on." actions={<Button onClick={() => setEdit({ m: { ...blank } })}><Plus className="h-4 w-4" /> New module</Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((m) => {
          const I = iconFor(m.icon);
          const usage = tenants.filter((t) => t.modules.includes(m.key)).length;
          return (
            <button key={m.key} onClick={() => setEdit({ m: structuredClone(m), orig: m.key })} className="rounded-xl border bg-card p-5 text-left transition hover:border-primary/40 hover:shadow-sm">
              <div className="flex items-start justify-between">
                <span className="brand-soft rounded-lg p-2"><I className="h-5 w-5" /></span>
                <Badge variant={m.status === "active" ? "secondary" : m.status === "beta" ? "outline" : "destructive"} className="capitalize">{m.status}</Badge>
              </div>
              <div className="mt-3 font-semibold">{m.name} <span className="font-mono text-xs text-muted-foreground">{m.key}</span></div>
              <p className="text-sm text-muted-foreground">{m.description}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-medium">{m.price ? `$${m.price}/mo` : "Free"}</span>
                <span className="text-muted-foreground">Used by {usage} tenant{usage === 1 ? "" : "s"}</span>
              </div>
              {m.dependsOn.length > 0 && <div className="mt-2 text-xs text-muted-foreground">Depends on: {m.dependsOn.join(", ")}</div>}
            </button>
          );
        })}
      </div>
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>{edit?.orig ? "Edit module" : "New module"}</SheetTitle></SheetHeader>
          {edit && (
            <div className="space-y-4 px-4 pb-6">
              <div className="space-y-1.5"><Label>Name</Label><Input value={edit.m.name} onChange={(e) => setEdit({ ...edit, m: { ...edit.m, name: e.target.value } })} /></div>
              <div className="space-y-1.5"><Label>Key</Label><Input value={edit.m.key} disabled={!!edit.orig} onChange={(e) => setEdit({ ...edit, m: { ...edit.m, key: e.target.value } })} className="font-mono" /></div>
              <div className="space-y-1.5"><Label>Description</Label><Input value={edit.m.description} onChange={(e) => setEdit({ ...edit, m: { ...edit.m, description: e.target.value } })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Price / month</Label><Input type="number" value={edit.m.price} onChange={(e) => setEdit({ ...edit, m: { ...edit.m, price: Number(e.target.value) } })} /></div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={edit.m.status} onValueChange={(v) => setEdit({ ...edit, m: { ...edit.m, status: v as ModuleDef["status"] } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["active", "beta", "deprecated"].map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Icon</Label>
                <div className="grid grid-cols-8 gap-1">
                  {ICON_CHOICES.map((n) => { const I = iconFor(n); return <button key={n} type="button" onClick={() => setEdit({ ...edit, m: { ...edit.m, icon: n } })} className={`rounded-md p-2 ${edit.m.icon === n ? "brand-soft ring-1 ring-primary" : "hover:bg-muted"}`} aria-label={n}><I className="h-4 w-4" /></button>; })}
                </div>
              </div>
              <div className="space-y-1.5"><Label>Depends on</Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  {modules.filter((x) => x.key !== edit.m.key).map((x) => (
                    <label key={x.key} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={edit.m.dependsOn.includes(x.key)} onCheckedChange={(c) => setEdit({ ...edit, m: { ...edit.m, dependsOn: c ? [...edit.m.dependsOn, x.key] : edit.m.dependsOn.filter((d) => d !== x.key) } })} />{x.name}
                    </label>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={submit}>Save module</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
