import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { ModulePicker, PriceSummary } from "@/components/ModulePicker";
import { PageHeader } from "@/components/shell/PortalShell";
import { useTenant, useTenantPrice } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/settings/modules")({ head: () => pageHead('Workspace modules', 'Manage enabled tenant modules and dependencies.'), component: ModulesSettings });

function ModulesSettings() {
  const tenant = useTenant();
  const modules = useAppStore((s) => s.modules);
  const update = useAppStore((s) => s.updateTenant);
  const log = useAppStore((s) => s.log);
  const price = useTenantPrice(tenant);
  const name = (k: string) => modules.find((m) => m.key === k)?.name ?? k;

  return (
    <div>
      <PageHeader title="Modules" description="Switch features on or off. Dependencies are handled for you." />
      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <ModulePicker modules={modules} enabled={tenant.modules} onChange={(next, info) => {
          update(tenant.id, (t) => { t.modules = next; });
          log(tenant.name, info.on ? "enabled module" : "disabled module", name(info.key));
          toast.success(`${name(info.key)} ${info.on ? "enabled" : "disabled"}`, { description: info.also.length ? `${info.on ? "Also enabled" : "Also disabled"}: ${info.also.map(name).join(", ")}` : undefined });
        }} />
        <div className="xl:sticky xl:top-20 xl:self-start"><PriceSummary price={price} /></div>
      </div>
    </div>
  );
}
