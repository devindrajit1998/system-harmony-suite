import { createFileRoute } from "@tanstack/react-router";
import { ArchiveRestore, ArrowDown, ArrowUp, EyeOff, GripVertical, Lock, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DynamicForm } from "@/components/dynamic/DynamicForm";
import { PageHeader } from "@/components/shell/PortalShell";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uid } from "@/data/seed";
import type { FieldDef, FieldRules, FieldType, RecordRow } from "@/data/types";
import { isEmpty } from "@/lib/validation";
import { resolveFields, useModules, useTenant, useTerms } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/settings/fields")({ component: FieldBuilder });

const TYPES: FieldType[] = ["text", "number", "date", "select", "multiselect", "textarea", "boolean"];

type Draft = { f: FieldDef & { required?: boolean }; orig?: string; options: string[]; retired: string[] };

const usesOption = (v: unknown, o: string) => v === o || (Array.isArray(v) && v.includes(o));

function FieldBuilder() {
  const tenant = useTenant();
  const modules = useModules();
  const { tp } = useTerms();
  const s = useAppStore();
  const entities = modules.filter((m) => m.entity).map((m) => m.entity!);
  const [tab, setTab] = useState(entities[0] ?? "customer");
  const [showDep, setShowDep] = useState(false);
  const entity = entities.includes(tab) ? tab : entities[0];
  const all = useMemo(() => (entity ? resolveFields(tenant, entity, true, true) : []), [tenant, entity]);
  const fields = all.filter((f) => showDep || !f.deprecated);
  const preview = all.filter((f) => f.enabled && !f.deprecated);
  const rows: RecordRow[] = useAppStore((st) => (entity ? st.records[tenant.id]?.[entity] : undefined)) ?? [];
  const usage = (key: string) => rows.filter((r) => !isEmpty(r.values[key])).length;
  const [dlg, setDlg] = useState<Draft | null>(null);
  const [purge, setPurge] = useState<FieldDef | null>(null);
  const [dragKey, setDragKey] = useState<string | null>(null);

  if (!entity) return <PageHeader title="Fields" description="Enable a module with records to configure its fields." />;

  const reorder = (key: string, to: number) => {
    const keys = all.map((f) => f.key).filter((k) => k !== key);
    keys.splice(Math.max(0, Math.min(to, keys.length)), 0, key);
    s.setFieldOrder(tenant.id, entity, keys);
  };
  const posOf = (key: string) => all.findIndex((f) => f.key === key);
  const visibleNeighbor = (key: string, d: number) => { const i = fields.findIndex((f) => f.key === key) + d; return fields[i]; };

  const saveCustom = () => {
    if (!dlg) return;
    const label = dlg.f.label.trim();
    if (!label) return toast.error("Give the field a label");
    const clash = all.find((f) => f.key !== dlg.orig && f.label.toLowerCase() === label.toLowerCase());
    if (clash) return toast.error(clash.deprecated ? `A deprecated field is already called "${clash.label}". Restore it, or use a different name.` : "A field with that name already exists");
    const key = dlg.orig ?? `cf_${tenant.id}_${uid()}`;
    const hasOpts = ["select", "multiselect"].includes(dlg.f.type);
    if (hasOpts && !dlg.options.some((o) => !dlg.retired.includes(o))) return toast.error("Add at least one option");
    const r = dlg.f.rules ?? {};
    if (r.min !== undefined && r.max !== undefined && r.min > r.max) return toast.error("Minimum can't be greater than maximum");
    const { required, ...rest } = dlg.f;
    const field: FieldDef = { ...rest, key, label, tier: "custom", options: hasOpts ? dlg.options : undefined, retiredOptions: hasOpts && dlg.retired.length ? dlg.retired : undefined, rules: cleanRules(dlg.f.type, r) };
    s.saveCustomField(tenant.id, entity, field, dlg.orig);
    s.setFieldSetting(tenant.id, entity, key, { enabled: true, required: !!required });
    s.log(tenant.name, dlg.orig ? "updated field" : "created field", label);
    toast.success(`Field "${label}" saved`);
    setDlg(null);
  };

  const deprecate = (f: FieldDef, v: boolean) => {
    s.setCustomFieldDeprecated(tenant.id, entity, f.key, v);
    s.log(tenant.name, v ? "deprecated field" : "restored field", f.label);
    toast.success(v ? `"${f.label}" deprecated — its data is kept` : `"${f.label}" restored`);
  };

  const editing = dlg?.orig ? usage(dlg.orig) : 0;

  return (
    <div>
      <PageHeader title="Field builder" description="Choose what you collect. Drag to reorder — forms and tables follow the same order." actions={
        <>
          <label className="flex items-center gap-2 text-sm"><Switch checked={showDep} onCheckedChange={setShowDep} /> Show deprecated</label>
          <Button variant="outline" onClick={() => { s.setFieldOrder(tenant.id, entity, null); toast.success("Default order restored"); }}><RotateCcw className="h-4 w-4" /> Reset to default order</Button>
          <Button onClick={() => setDlg({ f: { key: "", label: "", type: "text", tier: "custom" }, options: [], retired: [] })}><Plus className="h-4 w-4" /> Custom field</Button>
        </>
      } />
      <Tabs value={entity} onValueChange={setTab} className="mb-4">
        <TabsList className="h-auto flex-wrap">{entities.map((e) => <TabsTrigger key={e} value={e}>{tp(e)}</TabsTrigger>)}</TabsList>
      </Tabs>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="divide-y rounded-xl border bg-card">
          {fields.map((f, i) => (
            <div key={f.key} draggable={!f.deprecated}
              onDragStart={() => setDragKey(f.key)} onDragOver={(e) => e.preventDefault()}
              onDrop={() => { if (dragKey && dragKey !== f.key) reorder(dragKey, posOf(f.key)); setDragKey(null); }}
              className={`flex flex-wrap items-center gap-3 p-3 ${f.deprecated ? "opacity-50" : ""} ${dragKey === f.key ? "bg-muted" : ""}`}>
              <GripVertical className={`h-4 w-4 shrink-0 text-muted-foreground ${f.deprecated ? "invisible" : "cursor-grab"}`} />
              <div className="min-w-[160px] flex-1">
                {f.tier === "module" ? (
                  <Input defaultValue={f.label} key={`${f.key}-${f.label}`} className="h-8" aria-label={`Label for ${f.key}`}
                    onBlur={(e) => { const v = e.target.value.trim(); s.setFieldSetting(tenant.id, entity, f.key, { label: v }); }} />
                ) : <div className="font-medium">{f.label}</div>}
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{f.key}</span>·<span>{f.type}</span>
                </div>
              </div>
              {f.deprecated && <Badge variant="destructive">Deprecated</Badge>}
              <Badge variant={f.tier === "system" ? "secondary" : f.tier === "custom" ? "default" : "outline"} className="capitalize">{f.tier}</Badge>
              {f.tier === "system" ? (
                <span className="flex w-[170px] items-center justify-end gap-1 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" /> Always on</span>
              ) : (
                <div className="flex w-[170px] items-center justify-end gap-3 text-xs">
                  <label className="flex items-center gap-1.5">On<Switch disabled={f.deprecated} checked={f.enabled} onCheckedChange={(v) => s.setFieldSetting(tenant.id, entity, f.key, { enabled: v })} /></label>
                  <label className="flex items-center gap-1.5">Required<Switch disabled={f.deprecated} checked={f.required} onCheckedChange={(v) => s.setFieldSetting(tenant.id, entity, f.key, { required: v })} /></label>
                </div>
              )}
              <div className="flex w-[176px] justify-end gap-0.5">
                {f.deprecated ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => deprecate(f, false)}><ArchiveRestore className="h-4 w-4" /> Restore</Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setPurge(f)} aria-label="Delete permanently"><Trash2 className="h-4 w-4" /></Button>
                  </>
                ) : (
                  <>
                    <Button size="icon" variant="ghost" disabled={i === 0} onClick={() => reorder(f.key, posOf(visibleNeighbor(f.key, -1).key))} aria-label="Move up"><ArrowUp className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" disabled={i === fields.length - 1} onClick={() => reorder(f.key, posOf(visibleNeighbor(f.key, 1).key))} aria-label="Move down"><ArrowDown className="h-4 w-4" /></Button>
                    {f.tier === "custom" && (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => setDlg({ f: { ...f }, orig: f.key, options: [...(f.options ?? [])], retired: [...(f.retiredOptions ?? [])] })} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deprecate(f, true)} aria-label="Deprecate"><EyeOff className="h-4 w-4" /></Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Live preview</h3><Badge variant="outline">{preview.length} fields</Badge></div>
            <DynamicForm key={preview.map((f) => f.key + f.required + f.label + JSON.stringify(f.rules ?? {})).join()} fields={preview} preview onSubmit={() => toast.success("All fields are valid")} />
          </div>
        </div>
      </div>

      <AlertDialog open={!!purge} onOpenChange={(o) => !o && setPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{purge?.label}" permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {purge && usage(purge.key) > 0 ? `${usage(purge.key)} ${usage(purge.key) === 1 ? "record holds" : "records hold"} data for this field. That data will be erased.` : "No records hold data for this field."} This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (!purge) return;
              s.deleteCustomField(tenant.id, entity, purge.key);
              s.log(tenant.name, "permanently deleted field", purge.label);
              toast.success("Field deleted permanently");
              setPurge(null);
            }}>Delete permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!dlg} onOpenChange={(o) => !o && setDlg(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{dlg?.orig ? "Edit custom field" : `New ${tp(entity).toLowerCase()} field`}</DialogTitle></DialogHeader>
          {dlg && (
            <div className="space-y-4">
              <div className="space-y-1.5"><Label>Label</Label><Input autoFocus value={dlg.f.label} onChange={(e) => setDlg({ ...dlg, f: { ...dlg.f, label: e.target.value } })} placeholder="e.g. Preferred contact time" /></div>
              <div className="space-y-1.5"><Label>Type</Label>
                {editing > 0 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div tabIndex={0}><Select value={dlg.f.type} disabled><SelectTrigger aria-label="Type (locked)"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={dlg.f.type} className="capitalize">{dlg.f.type}</SelectItem></SelectContent></Select></div>
                    </TooltipTrigger>
                    <TooltipContent>Has data. Deprecate this field and create a new one instead.</TooltipContent>
                  </Tooltip>
                ) : (
                  <Select value={dlg.f.type} onValueChange={(v) => setDlg({ ...dlg, f: { ...dlg.f, type: v as FieldType, rules: {} } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              {["select", "multiselect"].includes(dlg.f.type) && (
                <OptionsEditor value={dlg.options} retired={dlg.retired}
                  usage={(o) => (dlg.orig ? rows.filter((r) => usesOption(r.values[dlg.orig!], o)).length : 0)}
                  onChange={(options, retired) => setDlg({ ...dlg, options, retired })} />
              )}
              <RulesEditor type={dlg.f.type} rules={dlg.f.rules ?? {}} onChange={(rules) => setDlg({ ...dlg, f: { ...dlg.f, rules } })} />
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!dlg.f.required} onCheckedChange={(v) => setDlg({ ...dlg, f: { ...dlg.f, required: v } })} /> Required</label>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button><Button onClick={saveCustom}>Save field</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cleanRules(type: FieldType, r: FieldRules): FieldRules | undefined {
  const out: FieldRules = {};
  if ((type === "text" || type === "textarea") && r.maxLength) out.maxLength = r.maxLength;
  if (type === "number") { if (r.min !== undefined) out.min = r.min; if (r.max !== undefined) out.max = r.max; }
  if (type === "date") { if (r.noFuture) out.noFuture = true; if (r.noPast) out.noPast = true; }
  return Object.keys(out).length ? out : undefined;
}

function RulesEditor({ type, rules, onChange }: { type: FieldType; rules: FieldRules; onChange: (r: FieldRules) => void }) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  let body: React.ReactNode = null;
  if (type === "text" || type === "textarea")
    body = <div className="space-y-1.5"><Label htmlFor="r-max-len">Max length</Label><Input id="r-max-len" type="number" min={1} value={rules.maxLength ?? ""} onChange={(e) => onChange({ ...rules, maxLength: num(e.target.value) })} placeholder="No limit" /></div>;
  else if (type === "number")
    body = (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label htmlFor="r-min">Minimum</Label><Input id="r-min" type="number" value={rules.min ?? ""} onChange={(e) => onChange({ ...rules, min: num(e.target.value) })} placeholder="None" /></div>
        <div className="space-y-1.5"><Label htmlFor="r-max">Maximum</Label><Input id="r-max" type="number" value={rules.max ?? ""} onChange={(e) => onChange({ ...rules, max: num(e.target.value) })} placeholder="None" /></div>
      </div>
    );
  else if (type === "date")
    body = (
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><Checkbox checked={!!rules.noFuture} onCheckedChange={(c) => onChange({ ...rules, noFuture: !!c, noPast: c ? false : rules.noPast })} /> No future dates</label>
        <label className="flex items-center gap-2"><Checkbox checked={!!rules.noPast} onCheckedChange={(c) => onChange({ ...rules, noPast: !!c, noFuture: c ? false : rules.noFuture })} /> No past dates</label>
      </div>
    );
  else if (type === "select" || type === "multiselect")
    body = <p className="text-xs text-muted-foreground">When required, a value must be chosen.</p>;
  if (!body) return null;
  return <div className="space-y-2 rounded-lg border p-3"><div className="text-sm font-medium">Validation</div>{body}</div>;
}

function OptionsEditor({ value, retired, usage, onChange }: { value: string[]; retired: string[]; usage: (o: string) => number; onChange: (v: string[], retired: string[]) => void }) {
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState<{ o: string; n: number } | null>(null);
  const add = () => {
    const v = text.trim().replace(/,/g, "");
    if (!v) return toast.error("Option can't be empty");
    if (value.some((o) => o.toLowerCase() === v.toLowerCase())) return toast.error("That option already exists");
    onChange([...value, v], retired); setText("");
  };
  const move = (i: number, d: number) => { const n = [...value]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; onChange(n, retired); };
  const remove = (o: string) => {
    const n = usage(o);
    if (n > 0) setConfirm({ o, n });
    else onChange(value.filter((x) => x !== o), retired.filter((x) => x !== o));
  };
  const active = value.filter((o) => !retired.includes(o));
  return (
    <div className="space-y-1.5">
      <Label>Options</Label>
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="e.g. Morning" aria-label="New option" />
        <Button type="button" variant="outline" onClick={add}><Plus className="h-4 w-4" /> Add</Button>
      </div>
      <ul className="space-y-1">
        {value.map((o, i) => {
          const isRet = retired.includes(o);
          return (
            <li key={o} className={`flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm ${isRet ? "opacity-60" : ""}`}>
              <span className="flex-1">{o}{isRet && <Badge variant="outline" className="ml-2">Retired</Badge>}</span>
              {isRet ? (
                <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => onChange(value, retired.filter((x) => x !== o))}>Restore</Button>
              ) : (
                <>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${o} up`}><ArrowUp className="h-3.5 w-3.5" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${o} down`}><ArrowDown className="h-3.5 w-3.5" /></Button>
                </>
              )}
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={isRet && usage(o) > 0} onClick={() => remove(o)} aria-label={`Remove ${o}`}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>
          );
        })}
        {!active.length && <li className="text-xs text-destructive">Add at least one option.</li>}
      </ul>
      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>"{confirm?.o}" is in use</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.n} {confirm?.n === 1 ? "record uses" : "records use"} this option, so it can't be removed. Retire it instead: old records keep it, shown as "{confirm?.o} (retired)", but it can't be picked anymore.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction autoFocus onClick={() => { if (confirm) onChange(value, [...retired, confirm.o]); setConfirm(null); }}>Retire option</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
