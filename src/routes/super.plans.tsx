import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/app-store";
import { useState } from "react";
import type { PlanDef } from "@/data/types";

export const Route = createFileRoute("/super/plans")({ head: () => pageHead('Platform plans', 'Manage Starter, Pro and Business plans.'), component: PlansPage });

function PlanCard({ plan, count }: { plan: PlanDef; count: number }) {
  const save = useAppStore((s) => s.savePlan);
  const log = useAppStore((s) => s.log);
  const [d, setD] = useState(plan);
  const num = (v: string) => (v === "" ? null : Number(v));
  return (
    <div className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} className="font-display h-9 max-w-[60%] text-lg font-bold" />
        <span className="text-xs text-muted-foreground">{count} tenants</span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="font-display text-4xl font-bold">$</span>
        <Input type="number" value={d.price} onChange={(e) => setD({ ...d, price: Number(e.target.value) })} className="font-display h-12 w-28 text-3xl font-bold" />
        <span className="text-muted-foreground">/mo</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label className="text-xs">Seats (blank = unlimited)</Label><Input type="number" value={d.seats ?? ""} onChange={(e) => setD({ ...d, seats: num(e.target.value) })} /></div>
        <div className="space-y-1"><Label className="text-xs">Locations</Label><Input type="number" value={d.locations ?? ""} onChange={(e) => setD({ ...d, locations: num(e.target.value) })} /></div>
      </div>
      <div className="mt-3 space-y-1"><Label className="text-xs">Features (one per line)</Label><Textarea rows={4} value={d.features.join("\n")} onChange={(e) => setD({ ...d, features: e.target.value.split("\n") })} /></div>
      <Button className="mt-4" onClick={() => { save({ ...d, features: d.features.filter(Boolean) }); log("Super Admin", "updated plan", d.name); toast.success(`${d.name} plan saved`); }}>Save plan</Button>
    </div>
  );
}

function PlansPage() {
  const plans = useAppStore((s) => s.plans);
  const tenants = useAppStore((s) => s.tenants);
  return (
    <div>
      <PageHeader title="Plans & pricing" description="Base plans. Module add-ons are billed on top." />
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => <PlanCard key={p.key} plan={p} count={tenants.filter((t) => t.plan === p.key).length} />)}
      </div>
    </div>
  );
}
