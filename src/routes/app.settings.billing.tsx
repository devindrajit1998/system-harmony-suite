import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { PriceSummary } from "@/components/ModulePicker";
import { PageHeader } from "@/components/shell/PortalShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useModules, useTenant, useTenantPrice } from "@/hooks/use-tenant";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/settings/billing")({ component: Billing });

function Billing() {
  const tenant = useTenant();
  const plans = useAppStore((s) => s.plans);
  const update = useAppStore((s) => s.updateTenant);
  const log = useAppStore((s) => s.log);
  const modules = useModules();
  const price = useTenantPrice(tenant);
  const invoices = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i, 1);
    return { id: `INV-${tenant.id.slice(0, 3).toUpperCase()}-${2400 - i}`, date: d.toLocaleDateString("en", { dateStyle: "medium" }), amount: price.total, status: i === 0 && tenant.status === "suspended" ? "Failed" : "Paid" };
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Plan & billing" description="Your subscription, add-ons and invoices." />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const current = p.key === tenant.plan;
          return (
            <div key={p.key} className={cn("rounded-xl border bg-card p-5", current && "border-primary ring-1 ring-primary")}>
              <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{p.name}</h3>{current && <Badge>Current</Badge>}</div>
              <div className="font-display mt-2 text-3xl font-bold">${p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>{p.seats ?? "Unlimited"} seats · {p.locations ?? "Unlimited"} locations</li>
                {p.features.map((f) => <li key={f} className="flex gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 text-success" />{f}</li>)}
              </ul>
              {!current && <Button variant="outline" className="mt-4 w-full" onClick={() => { update(tenant.id, (t) => { t.plan = p.key; }); log(tenant.name, "changed plan", p.name); toast.success(`Switched to ${p.name}`); }}>Switch to {p.name}</Button>}
            </div>
          );
        })}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border bg-card">
          <h3 className="border-b p-4 font-semibold">Add-on modules</h3>
          <div className="divide-y text-sm">
            {modules.map((m) => <div key={m.key} className="flex justify-between px-4 py-2.5"><span>{m.name}</span><span className="text-muted-foreground">{m.price ? `$${m.price}/mo` : "Included"}</span></div>)}
          </div>
        </div>
        <PriceSummary price={price} />
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <h3 className="border-b p-4 font-semibold">Invoice history</h3>
        <Table>
          <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {invoices.map((i) => (
              <TableRow key={i.id}><TableCell className="font-mono text-xs">{i.id}</TableCell><TableCell>{i.date}</TableCell><TableCell>${i.amount.toFixed(2)}</TableCell><TableCell><Badge variant={i.status === "Paid" ? "secondary" : "destructive"}>{i.status}</Badge></TableCell></TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
