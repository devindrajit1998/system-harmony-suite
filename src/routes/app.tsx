import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Blocks, CreditCard, Eye, FormInput, Languages, LayoutDashboard, RefreshCw, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { PortalShell, type NavItem } from "@/components/shell/PortalShell";
import { Button } from "@/components/ui/button";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { useModules, useTenant, useTerms } from "@/hooks/use-tenant";
import { iconFor } from "@/lib/icons";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Business Admin — Modulo" },
      { name: "description", content: "Run your business with the modules you've switched on." },
      { property: "og:title", content: "Business Admin — Modulo" },
      { property: "og:description", content: "Your modules, your fields, your words." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TenantLayout,
});

function TenantLayout() {
  const tenant = useTenant();
  const modules = useModules();
  const { tp } = useTerms();
  const impersonating = useAppStore((s) => s.impersonating);
  const stop = useAppStore((s) => s.stopImpersonating);
  const navigate = useNavigate();

  const moduleItems: NavItem[] = modules.map((m) => ({ title: m.entity ? tp(m.entity) : m.name, to: `/app/${m.key}`, icon: iconFor(m.icon) }));

  return (
    <PortalShell
      portal="tenant"
      style={{ "--brand": tenant.color } as CSSProperties}
      brand={
        <div className="flex items-center gap-2 px-1">
          <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">{tenant.name[0]}</span>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate font-semibold">{tenant.name}</div>
            <div className="text-xs capitalize text-muted-foreground">{tenant.plan} plan</div>
          </div>
        </div>
      }
      groups={[
        { label: "Workspace", items: [{ title: "Dashboard", to: "/app", icon: LayoutDashboard, exact: true }, ...moduleItems] },
        {
          label: "Settings",
          items: [
            { title: "Modules", to: "/app/settings/modules", icon: Blocks },
            { title: "Fields", to: "/app/settings/fields", icon: FormInput },
            { title: "Terminology", to: "/app/settings/terminology", icon: Languages },
            { title: "Roles & Permissions", to: "/app/settings/roles", icon: ShieldCheck },
            { title: "Plan & Billing", to: "/app/settings/billing", icon: CreditCard },
          ],
        },
      ]}
      footer={
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Restart onboarding" onClick={() => navigate({ to: "/onboarding", search: { tenant: tenant.id } })}>
              <RefreshCw className="h-4 w-4" /><span>Restart onboarding</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      }
      banner={
        <>
          {impersonating && (
            <div className="flex items-center gap-3 bg-highlight px-4 py-2 text-sm text-highlight-foreground">
              <Eye className="h-4 w-4" />
              <span>You are impersonating <strong>{tenant.name}</strong> as Super Admin.</span>
              <Button size="sm" variant="outline" className="ml-auto h-7 border-highlight-foreground/30 bg-transparent" onClick={() => { stop(); navigate({ to: "/super/tenants" }); }}>Exit</Button>
            </div>
          )}
          {tenant.status === "suspended" && <div className="bg-destructive/10 px-4 py-2 text-sm text-destructive">This account is suspended. Data is read-only for the customer.</div>}
          {tenant.status === "trial" && <div className="brand-soft px-4 py-2 text-sm">Trial account — 14 days left.</div>}
        </>
      }
    >
      <Outlet />
    </PortalShell>
  );
}
