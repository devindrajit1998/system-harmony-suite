import { Link, createFileRoute } from "@tanstack/react-router";
import { Lock, Plus } from "lucide-react";
import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { DynamicForm } from "@/components/dynamic/DynamicForm";
import { DynamicTable } from "@/components/dynamic/DynamicTable";
import { EmptyState, PageHeader } from "@/components/shell/PortalShell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { uid } from "@/data/seed";
import type { RecordRow } from "@/data/types";
import { useFields, useModules, useTenant, useTerms } from "@/hooks/use-tenant";
import { iconFor } from "@/lib/icons";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/$module")({ component: ModulePage });

function ModulePage() {
  const { module } = Route.useParams();
  const enabled = useModules();
  const all = useAppStore((s) => s.modules);
  const m = enabled.find((x) => x.key === module);

  if (!m) {
    const exists = all.find((x) => x.key === module);
    return (
      <EmptyState icon={Lock} title={exists ? `${exists.name} is turned off` : "Page not found"} description={exists ? "Turn this module on to start using it." : undefined}
        action={exists && <Button asChild><Link to="/app/settings/modules">Go to modules</Link></Button>} />
    );
  }
  if (!m.entity) return <Reports />;
  return <EntityPage key={m.key} entity={m.entity} icon={m.icon} />;
}

function EntityPage({ entity, icon }: { entity: string; icon: string }) {
  const tenant = useTenant();
  const fields = useFields(entity);
  const { t, tp } = useTerms();
  const rows = useAppStore((s) => s.records[tenant.id]?.[entity]) ?? [];
  const upsert = useAppStore((s) => s.upsertRecord);
  const del = useAppStore((s) => s.deleteRecord);
  const [edit, setEdit] = useState<RecordRow | "new" | null>(null);
  const Icon = iconFor(icon);
  const label = t(entity);

  const save = (values: Record<string, unknown>) => {
    const row: RecordRow = edit === "new" || !edit ? { id: uid(), createdAt: new Date().toISOString().slice(0, 10), values } : { ...edit, values: { ...edit.values, ...values } };
    upsert(tenant.id, entity, row);
    toast.success(`${label} ${edit === "new" ? "added" : "updated"}`);
    setEdit(null);
  };

  return (
    <div>
      <PageHeader title={tp(entity)} description={`${rows.length} ${tp(entity).toLowerCase()} · ${fields.length} fields shown`} actions={<Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> Add {label.toLowerCase()}</Button>} />
      {rows.length === 0 ? (
        <EmptyState icon={Icon} title={`No ${tp(entity).toLowerCase()} yet`} description={`Add your first ${label.toLowerCase()} to get started.`} action={<Button onClick={() => setEdit("new")}><Plus className="h-4 w-4" /> Add {label.toLowerCase()}</Button>} />
      ) : (
        <DynamicTable fields={fields} rows={rows} currency={tenant.currency} onEdit={setEdit}
          onDelete={(r) => { del(tenant.id, entity, r.id); toast(`${label} deleted`, { action: { label: "Undo", onClick: () => upsert(tenant.id, entity, r) } }); }} />
      )}
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{edit === "new" ? `New ${label.toLowerCase()}` : `Edit ${label.toLowerCase()}`}</SheetTitle>
            <SheetDescription>Fields marked * are required.</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            {edit && <DynamicForm key={edit === "new" ? "new" : edit.id} fields={fields} initial={edit === "new" ? { status: fields.find((f) => f.key === "status")?.options?.[0] } : edit.values} onSubmit={save} onCancel={() => setEdit(null)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Reports() {
  const tenant = useTenant();
  const enabled = useModules();
  const { tp } = useTerms();
  const records = useAppStore((s) => s.records[tenant.id]) ?? {};
  const data = enabled.filter((m) => m.entity).map((m) => ({ name: tp(m.entity!), count: records[m.entity!]?.length ?? 0 }));
  return (
    <div>
      <PageHeader title="Reports" description="Record counts across your enabled modules." />
      <div className="h-80 rounded-xl border bg-card p-5">
        <ResponsiveContainer>
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
            <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
