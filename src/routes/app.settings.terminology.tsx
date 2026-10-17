import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shell/PortalShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_TERMS } from "@/data/catalog";
import { useModules, useTenant } from "@/hooks/use-tenant";
import { plural } from "@/lib/rules";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/settings/terminology")({ component: Terminology });

function Terminology() {
  const tenant = useTenant();
  const modules = useModules();
  const update = useAppStore((s) => s.updateTenant);
  const keys = [...new Set(modules.map((m) => m.entity).filter(Boolean) as string[])];
  const set = (k: string, v: string) => update(tenant.id, (t) => { if (v.trim()) t.terms[k] = v; else delete t.terms[k]; });

  return (
    <div className="max-w-2xl">
      <PageHeader title="Terminology" description="Use your own words. Every menu, page, form and label updates as you type." />
      <div className="divide-y rounded-xl border bg-card">
        {keys.map((k) => (
          <div key={k} className="grid grid-cols-[1fr_1.4fr_auto] items-center gap-4 p-3">
            <div>
              <div className="text-sm font-medium">{DEFAULT_TERMS[k]}</div>
              <div className="text-xs text-muted-foreground">Shown as “{plural(tenant.terms[k] || DEFAULT_TERMS[k])}”</div>
            </div>
            <Input value={tenant.terms[k] ?? ""} placeholder={DEFAULT_TERMS[k]} onChange={(e) => set(k, e.target.value)} aria-label={`Term for ${DEFAULT_TERMS[k]}`} />
            <Button variant="ghost" size="icon" disabled={!tenant.terms[k]} onClick={() => set(k, "")} aria-label="Reset"><RotateCcw className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
