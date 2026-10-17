import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, Plus } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/shell/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Tenant } from "@/data/types";
import { iconFor } from "@/lib/icons";
import { monthlyPrice } from "@/lib/rules";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/super/tenants")({ component: TenantsPage });

const statusVariant = { active: "default", trial: "secondary", suspended: "destructive" } as const;

function TenantsPage() {
  const s = useAppStore();
  const navigate = useNavigate();
  const [f, setF] = useState({ type: "all", plan: "all", status: "all" });
  const [open, setOpen] = useState<Tenant | null>(null);
  const mrr = (t: Tenant) => monthlyPrice({ plan: s.plans.find((p) => p.key === t.plan), moduleKeys: t.modules, modules: s.modules, bundle: t.bundle }).total;
  const rows = s.tenants.filter((t) => (f.type === "all" || t.bundle === f.type) && (f.plan === "all" || t.plan === f.plan) && (f.status === "all" || t.status === f.status));

  const impersonate = (t: Tenant) => {
    s.setTenant(t.id, true);
    s.log("Super Admin", "impersonated", t.name);
    navigate({ to: "/app" });
  };

  const filter = (key: keyof typeof f, opts: [string, string][], label: string) => (
    <Select value={f[key]} onValueChange={(v) => setF({ ...f, [key]: v })}>
      <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}</SelectItem>
        {opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  return (
    <div>
      <PageHeader title="Tenants" description={`${s.tenants.length} businesses on the platform`} actions={<Button asChild><Link to="/onboarding"><Plus className="h-4 w-4" /> Add tenant</Link></Button>} />
      <div className="mb-3 flex flex-wrap gap-2">
        {filter("type", s.bundles.map((b) => [b.key, b.name]), "types")}
        {filter("plan", s.plans.map((p) => [p.key, p.name]), "plans")}
        {filter("status", [["active", "Active"], ["trial", "Trial"], ["suspended", "Suspended"]], "statuses")}
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader><TableRow><TableHead>Business</TableHead><TableHead>Type</TableHead><TableHead>Plan</TableHead><TableHead>Status</TableHead><TableHead>Modules</TableHead><TableHead className="text-right">MRR</TableHead><TableHead>Signed up</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => setOpen(t)}>
                <TableCell className="font-medium"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />{t.name}</TableCell>
                <TableCell>{s.bundles.find((b) => b.key === t.bundle)?.name ?? t.bundle}</TableCell>
                <TableCell className="capitalize">{t.plan}</TableCell>
                <TableCell><Badge variant={statusVariant[t.status]} className="capitalize">{t.status}</Badge></TableCell>
                <TableCell>{t.modules.length}</TableCell>
                <TableCell className="text-right font-medium">${mrr(t).toFixed(0)}</TableCell>
                <TableCell className="text-muted-foreground">{t.signupDate}</TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No tenants match these filters.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ background: open.color }} />{open.name}</SheetTitle>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-6">
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[["Type", s.bundles.find((b) => b.key === open.bundle)?.name], ["Plan", open.plan], ["Status", open.status], ["Currency", open.currency], ["Signed up", open.signupDate], ["MRR", `$${mrr(open).toFixed(2)}`]].map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium capitalize">{v}</dd></div>
                  ))}
                </dl>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Enabled modules</h4>
                  <div className="flex flex-wrap gap-2">
                    {open.modules.map((k) => {
                      const m = s.modules.find((x) => x.key === k);
                      const I = iconFor(m?.icon ?? "");
                      return <Badge key={k} variant="outline" className="gap-1"><I className="h-3 w-3" />{m?.name ?? k}</Badge>;
                    })}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Status</h4>
                  <Select value={open.status} onValueChange={(v) => { s.updateTenant(open.id, (t) => { t.status = v as Tenant["status"]; }); setOpen({ ...open, status: v as Tenant["status"] }); s.log("Super Admin", `set status ${v}`, open.name); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["active", "trial", "suspended"].map((x) => <SelectItem key={x} value={x} className="capitalize">{x}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => impersonate(open)}><Eye className="h-4 w-4" /> Impersonate</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
