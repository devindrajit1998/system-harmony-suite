import { createFileRoute } from "@tanstack/react-router";
import { Activity, Building2, DollarSign, Hourglass } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, StatCard } from "@/components/shell/PortalShell";
import { monthlyPrice } from "@/lib/rules";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/super/")({ component: SuperDashboard });

function SuperDashboard() {
  const tenants = useAppStore((s) => s.tenants);
  const modules = useAppStore((s) => s.modules);
  const plans = useAppStore((s) => s.plans);
  const bundles = useAppStore((s) => s.bundles);

  const mrrOf = (t: (typeof tenants)[number]) => monthlyPrice({ plan: plans.find((p) => p.key === t.plan), moduleKeys: t.modules, modules, bundle: t.bundle }).total;
  const mrr = tenants.filter((t) => t.status !== "suspended").reduce((s, t) => s + mrrOf(t), 0);

  const series = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const active = tenants.filter((t) => new Date(t.signupDate) <= new Date(d.getFullYear(), d.getMonth() + 1, 0));
      const base = active.reduce((s, t) => s + mrrOf(t), 0);
      return { month: d.toLocaleString("en", { month: "short" }), mrr: Math.round(base * (0.8 + i * 0.018)) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenants, modules, plans]);

  const byType = bundles.map((b) => ({ type: b.name, count: tenants.filter((t) => t.bundle === b.key).length })).filter((x) => x.count);
  const recent = [...tenants].sort((a, b) => b.signupDate.localeCompare(a.signupDate)).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title="Platform overview" description="Everything happening across your tenants." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total tenants" value={tenants.length} icon={Building2} />
        <StatCard label="MRR" value={`$${mrr.toFixed(0)}`} hint="Excludes suspended tenants" icon={DollarSign} />
        <StatCard label="Active tenants" value={tenants.filter((t) => t.status === "active").length} icon={Activity} />
        <StatCard label="On trial" value={tenants.filter((t) => t.status === "trial").length} icon={Hourglass} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold">MRR — last 12 months</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Line type="monotone" dataKey="mrr" stroke="var(--chart-2)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h3 className="mb-4 font-semibold">Tenants by business type</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={byType}>
                <XAxis dataKey="type" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip cursor={{ fill: "var(--muted)" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-3 font-semibold">Recent signups</h3>
        <div className="divide-y">
          {recent.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="h-8 w-8 rounded-lg" style={{ background: t.color }} />
              <div className="flex-1">
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{bundles.find((b) => b.key === t.bundle)?.name} · {t.plan}</div>
              </div>
              <span className="text-muted-foreground">{new Date(t.signupDate).toLocaleDateString("en", { dateStyle: "medium" })}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
