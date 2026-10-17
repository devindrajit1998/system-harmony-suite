import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BadgeCheck, CalendarClock, ChefHat, CreditCard, DollarSign, LayoutGrid, Package, ShoppingBag, Users } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, StatCard } from "@/components/shell/PortalShell";
import { Button } from "@/components/ui/button";
import type { RecordRow } from "@/data/types";
import { money, useModules, useTenant, useTerms } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/")({ component: TenantDashboard });

const today = () => new Date().toISOString().slice(0, 10);

function TenantDashboard() {
  const tenant = useTenant();
  const modules = useModules();
  const { t, tp } = useTerms();
  const records = useAppStore((s) => s.records[tenant.id]) ?? {};
  const on = (k: string) => modules.some((m) => m.key === k);
  const rows = (e: string): RecordRow[] => records[e] ?? [];
  const cur = tenant.currency;
  const sum = (e: string, f: string, ok: (r: RecordRow) => boolean = () => true) => rows(e).filter(ok).reduce((s, r) => s + Number(r.values[f] ?? 0), 0);

  const widgets = [
    on("billing") && <StatCard key="rev" label="Revenue collected" value={money(sum("invoice", "amount", (r) => r.values.status === "Paid"), cur)} hint={`${rows("invoice").filter((r) => r.values.status === "Overdue").length} overdue ${tp("invoice").toLowerCase()}`} icon={DollarSign} />,
    on("appointments") && <StatCard key="appt" label={`Today's ${tp("appointment").toLowerCase()}`} value={rows("appointment").filter((r) => r.values.date === today()).length} hint={`${rows("appointment").filter((r) => r.values.status === "Scheduled").length} upcoming`} icon={CalendarClock} />,
    on("memberships") && <StatCard key="mem" label={`Active ${tp("customer").toLowerCase()}`} value={rows("membership").filter((r) => r.values.status === "Active").length} hint={`${rows("membership").filter((r) => r.values.status === "Expired").length} expired`} icon={BadgeCheck} />,
    on("inventory") && <StatCard key="inv" label="Low stock items" value={rows("inventory").filter((r) => Number(r.values.stock) <= Number(r.values.reorder_level ?? 10)).length} hint="At or below reorder level" icon={AlertTriangle} />,
    on("orders") && <StatCard key="ord" label={`Open ${tp("order").toLowerCase()}`} value={rows("order").filter((r) => ["Pending", "Paid"].includes(String(r.values.status))).length} icon={ShoppingBag} />,
    on("pos") && <StatCard key="pos" label="POS sales" value={money(sum("sale", "total", (r) => r.values.status === "Completed"), cur)} icon={CreditCard} />,
    on("kds") && <StatCard key="kds" label="Tickets in kitchen" value={rows("ticket").filter((r) => ["New", "Cooking"].includes(String(r.values.status))).length} icon={ChefHat} />,
    on("tables") && <StatCard key="tab" label={`${tp("table")} occupied`} value={`${rows("table").filter((r) => r.values.status === "Occupied").length}/${rows("table").length}`} icon={LayoutGrid} />,
    on("customers") && <StatCard key="cus" label={`Total ${tp("customer").toLowerCase()}`} value={rows("customer").length} icon={Users} />,
    on("products") && <StatCard key="prd" label={tp("product")} value={rows("product").length} icon={Package} />,
  ].filter(Boolean);

  const revenueEntity = on("billing") ? ["invoice", "amount"] : on("pos") ? ["sale", "total"] : on("orders") ? ["order", "total"] : null;
  const chart = revenueEntity
    ? Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - 5 + i);
        const ym = d.toISOString().slice(0, 7);
        const base = rows(revenueEntity[0]).filter((r) => String(r.values.date ?? r.createdAt).startsWith(ym)).reduce((s, r) => s + Number(r.values[revenueEntity[1]] ?? 0), 0);
        return { month: d.toLocaleString("en", { month: "short" }), revenue: base || Math.round(sum(revenueEntity[0], revenueEntity[1]) / 8) };
      })
    : null;

  return (
    <div className="space-y-6">
      <PageHeader title={`Good day, ${tenant.name}`} description={`Here's what's happening with your ${tp("customer").toLowerCase()} today.`} actions={<Button asChild variant="outline"><Link to="/app/settings/modules">Manage modules</Link></Button>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{widgets}</div>
      {chart && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 font-semibold">Revenue trend</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={chart}>
                <defs><linearGradient id="rg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip formatter={(v: number) => money(v, cur)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#rg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {on("customers") && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-3 font-semibold">Newest {tp("customer").toLowerCase()}</h3>
          <div className="divide-y text-sm">
            {[...rows("customer")].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((r) => (
              <div key={r.id} className="flex justify-between py-2.5"><span className="font-medium">{String(r.values.name)}</span><span className="text-muted-foreground">{t("customer")} since {r.createdAt}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
