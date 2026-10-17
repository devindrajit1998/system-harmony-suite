import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/dynamic/DynamicForm";
import { PageHeader } from "@/components/shell/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FieldDef, FieldType } from "@/data/types";
import { resolveFields, useModules, useTenant, useTerms } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/settings/fields")({ component: FieldBuilder });

const TYPES: FieldType[] = ["text", "number", "date", "select", "multiselect", "textarea", "boolean"];

function FieldBuilder() {
  const tenant = useTenant();
  const modules = useModules();
  const { tp } = useTerms();
  const s = useAppStore();
  const entities = modules.filter((m) => m.entity).map((m) => m.entity!);
  const [tab, setTab] = useState(entities[0] ?? "customer");
  const entity = entities.includes(tab) ? tab : entities[0];
  const fields = useMemo(() => (entity ? resolveFields(tenant, entity, true) : []), [tenant, entity]);
  const preview = fields.filter((f) => f.enabled);
  const [dlg, setDlg] = useState<{ f: FieldDef & { required?: boolean }; orig?: string; optText: string } | null>(null);

  if (!entity) return <PageHeader title="Fields" description="Enable a module with records to configure its fields." />;

  const saveCustom = () => {
    if (!dlg) return;
    const label = dlg.f.label.trim();
    if (!label) return toast.error("Give the field a label");
    const key = dlg.orig ?? `cf_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
    if (!dlg.orig && fields.some((f) => f.key === key)) return toast.error("A field with that name already exists");
    const options = ["select", "multiselect"].includes(dlg.f.type) ? dlg.optText.split(",").map((o) => o.trim()).filter(Boolean) : undefined;
    if (options && !options.length) return toast.error("Add at least one option");
    s.saveCustomField(tenant.id, entity, { key, label, type: dlg.f.type, tier: "custom", options }, dlg.orig);
    s.setFieldSetting(tenant.id, entity, key, { enabled: true, required: !!dlg.f.required });
    s.log(tenant.name, dlg.orig ? "updated field" : "created field", label);
    toast.success(`Field "${label}" saved`);
    setDlg(null);
  };

  return (
    <div>
      <PageHeader title="Field builder" description="Choose what you collect. Changes show up in forms and tables immediately." actions={
        <Button onClick={() => setDlg({ f: { key: "", label: "", type: "text", tier: "custom" }, optText: "" })}><Plus className="h-4 w-4" /> Custom field</Button>
      } />
      <Tabs value={entity} onValueChange={setTab} className="mb-4">
        <TabsList className="h-auto flex-wrap">{entities.map((e) => <TabsTrigger key={e} value={e}>{tp(e)}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="divide-y rounded-xl border bg-card">
          {fields.map((f, i) => {
            const customs = fields.filter((x) => x.tier === "custom");
            const ci = customs.findIndex((x) => x.key === f.key);
            return (
              <div key={f.key} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-[160px] flex-1">
                  {f.tier === "module" ? (
                    <Input defaultValue={f.label} key={`${f.key}-${f.label}`} className="h-8" aria-label={`Label for ${f.key}`}
                      onBlur={(e) => { const v = e.target.value.trim(); s.setFieldSetting(tenant.id, entity, f.key, { label: v }); }} />
                  ) : <div className="font-medium">{f.label}</div>}
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{f.key}</span>·<span>{f.type}</span>
                  </div>
                </div>
                <Badge variant={f.tier === "system" ? "secondary" : f.tier === "custom" ? "default" : "outline"} className="capitalize">{f.tier}</Badge>
                {f.tier === "system" ? (
                  <span className="flex w-[170px] items-center justify-end gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Always on</span>
                ) : (
                  <div className="flex w-[170px] items-center justify-end gap-3 text-xs">
                    <label className="flex items-center gap-1.5">On<Switch checked={f.enabled} onCheckedChange={(v) => s.setFieldSetting(tenant.id, entity, f.key, { enabled: v })} /></label>
                    <label className="flex items-center gap-1.5">Required<Switch checked={f.required} onCheckedChange={(v) => s.setFieldSetting(tenant.id, entity, f.key, { required: v })} /></label>
                  </div>
                )}
                <div className="flex w-[132px] justify-end gap-0.5">
                  {f.tier === "custom" && (
                    <>
                      <Button size="icon" variant="ghost" disabled={ci === 0} onClick={() => s.moveCustomField(tenant.id, entity, f.key, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" disabled={ci === customs.length - 1} onClick={() => s.moveCustomField(tenant.id, entity, f.key, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setDlg({ f: { ...f }, orig: f.key, optText: (f.options ?? []).join(", ") })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { s.deleteCustomField(tenant.id, entity, f.key); toast.success("Field deleted"); }} aria-label="Delete"><Trash2 className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
                <span className="sr-only">{i}</span>
              </div>
            );
          })}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Live preview</h3><Badge variant="outline">{preview.length} fields</Badge></div>
            <DynamicForm key={preview.map((f) => f.key + f.required + f.label).join()} fields={preview} preview onSubmit={() => toast.success("All required fields are filled")} />
          </div>
        </div>
      </div>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dlg?.orig ? "Edit custom field" : `New ${tp(entity).toLowerCase()} field`}</DialogTitle></DialogHeader>
          {dlg && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Label</Label><Input autoFocus value={dlg.f.label} onChange={(e) => setDlg({ ...dlg, f: { ...dlg.f, label: e.target.value } })} placeholder="e.g. Preferred contact time" /></div>
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={dlg.f.type} onValueChange={(v) => setDlg({ ...dlg, f: { ...dlg.f, type: v as FieldType } })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["select", "multiselect"].includes(dlg.f.type) && (
                <div className="space-y-1.5"><Label>Options (comma separated)</Label><Input value={dlg.optText} onChange={(e) => setDlg({ ...dlg, optText: e.target.value })} placeholder="Morning, Afternoon, Evening" /></div>
              )}
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!dlg.f.required} onCheckedChange={(v) => setDlg({ ...dlg, f: { ...dlg.f, required: v } })} /> Required</label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button><Button onClick={saveCustom}>Save field</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
