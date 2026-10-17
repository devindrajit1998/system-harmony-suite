import { Outlet, createFileRoute } from "@tanstack/react-router";
import { Boxes, LayoutDashboard, Layers, ScrollText, Tag, Building2 } from "lucide-react";
import { PortalShell } from "@/components/shell/PortalShell";

export const Route = createFileRoute("/super")({
  head: () => ({
    meta: [
      { title: "Super Admin — Modulo" },
      { name: "description", content: "Platform owner console: tenants, modules, bundles, plans and audit log." },
      { property: "og:title", content: "Super Admin — Modulo" },
      { property: "og:description", content: "Manage every tenant, module and bundle on the platform." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuperLayout,
});

function SuperLayout() {
  return (
    <PortalShell
      portal="super"
      brand={
        <div className="flex items-center gap-2 px-1">
          <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">M</span>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <div className="font-display font-bold">Modulo</div>
            <div className="text-xs opacity-70">Platform console</div>
          </div>
        </div>
      }
      groups={[
        {
          label: "Platform",
          items: [
            { title: "Dashboard", to: "/super", icon: LayoutDashboard, exact: true },
            { title: "Tenants", to: "/super/tenants", icon: Building2 },
            { title: "Module Catalog", to: "/super/modules", icon: Boxes },
            { title: "Bundle Builder", to: "/super/bundles", icon: Layers },
            { title: "Plans & Pricing", to: "/super/plans", icon: Tag },
            { title: "Audit Log", to: "/super/audit", icon: ScrollText },
          ],
        },
      ]}
    >
      <Outlet />
    </PortalShell>
  );
}
