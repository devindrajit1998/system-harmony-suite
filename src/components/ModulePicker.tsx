import { useState } from "react";
import { Lock } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { ModuleDef } from "@/data/types";
import { iconFor } from "@/lib/icons";
import { dependents, disableModule, enableModule, withDependencies } from "@/lib/rules";
import { cn } from "@/lib/utils";

/** Module toggles with dependency rules. Enabling pulls in dependencies; disabling asks before removing dependents. */
export function ModulePicker({ modules, enabled, onChange, currency = "USD", compact }: {
  modules: ModuleDef[];
  enabled: string[];
  onChange: (next: string[], info: { key: string; on: boolean; also: string[] }) => void;
  currency?: string;
  compact?: boolean;
}) {
  const [pending, setPending] = useState<{ key: string; also: string[] } | null>(null);
  const name = (k: string) => modules.find((m) => m.key === k)?.name ?? k;
  const fmt = (n: number) => new Intl.NumberFormat("en", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  void currency;

  const toggle = (m: ModuleDef, on: boolean) => {
    if (on) {
      const next = enableModule(enabled, m.key, modules);
      onChange(next, { key: m.key, on, also: next.filter((k) => !enabled.includes(k) && k !== m.key) });
    } else {
      const also = dependents(enabled, m.key, modules);
      if (also.length) setPending({ key: m.key, also });
      else onChange(disableModule(enabled, m.key, modules), { key: m.key, on, also: [] });
    }
  };

  return (
    <>
      <div className={cn("grid gap-3", compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3")}>
        {modules.filter((m) => m.status !== "deprecated").map((m) => {
          const Icon = iconFor(m.icon);
          const on = enabled.includes(m.key);
          const deps = withDependencies(m.key, modules).filter((k) => k !== m.key);
          return (
            <div key={m.key} className={cn("flex items-start gap-3 rounded-xl border bg-card p-4 transition", on && "border-primary/50 ring-1 ring-primary/20")}>
              <span className={cn("rounded-lg p-2", on ? "brand-soft" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  {m.name}
                  {m.status === "beta" && <Badge variant="secondary">Beta</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{m.price ? `${fmt(m.price)}/mo` : "Included"}</div>
                {deps.length > 0 && <div className="mt-1 text-xs text-muted-foreground">Needs {deps.map(name).join(", ")}</div>}
              </div>
              {m.core ? <Lock className="mt-1 h-4 w-4 text-muted-foreground" aria-label="Core module" /> : <Switch checked={on} onCheckedChange={(v) => toggle(m, v)} aria-label={`Toggle ${m.name}`} />}
            </div>
          );
        })}
      </div>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Turn off {pending && name(pending.key)}?</AlertDialogTitle>
            <AlertDialogDescription>These modules depend on it and will also be turned off: <strong>{pending?.also.map(name).join(", ")}</strong>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it on</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pending) onChange(disableModule(enabled, pending.key, modules), { key: pending.key, on: false, also: pending.also }); setPending(null); }}>Turn off all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PriceSummary({ price, label = "Monthly total" }: { price: { plan: number; addons: number; discount: number; total: number }; label?: string }) {
  const f = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;
  return (
    <div className="rounded-xl border bg-card p-4 text-sm">
      <div className="flex justify-between py-1"><span className="text-muted-foreground">Plan</span>{f(price.plan)}</div>
      <div className="flex justify-between py-1"><span className="text-muted-foreground">Module add-ons</span>{f(price.addons)}</div>
      {price.discount > 0 && <div className="flex justify-between py-1 text-success"><span>Bundle discount (15%)</span>−{f(price.discount)}</div>}
      <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>{label}</span><span className="font-display">{f(price.total)}</span></div>
    </div>
  );
}
