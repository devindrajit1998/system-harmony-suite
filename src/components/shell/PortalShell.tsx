import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";
import { TopBar } from "./TopBar";

export interface NavItem {
  title: string;
  to: string;
  params?: Record<string, string>;
  icon: LucideIcon;
  exact?: boolean;
}

export function PortalShell({ portal, brand, groups, banner, footer, children, style }: {
  portal: "super" | "tenant";
  brand: ReactNode;
  groups: { label: string; items: NavItem[] }[];
  banner?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const href = (i: NavItem) => (i.params ? Object.entries(i.params).reduce((p, [k, v]) => p.replace(`$${k}`, v), i.to) : i.to);
  const active = (i: NavItem) => (i.exact ? path === href(i) : path === href(i) || path.startsWith(href(i) + "/"));

  return (
    <div className={portal === "super" ? "portal-super" : "portal-tenant"} style={style}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="icon">
            <SidebarHeader className="h-14 justify-center border-b border-sidebar-border">{brand}</SidebarHeader>
            <SidebarContent>
              {groups.filter((g) => g.items.length).map((g) => (
                <SidebarGroup key={g.label}>
                  <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {g.items.map((i) => (
                        <SidebarMenuItem key={href(i)}>
                          <SidebarMenuButton asChild isActive={active(i)} tooltip={i.title}>
                            <Link to={href(i)}>
                              <i.icon className="h-4 w-4" />
                              <span>{i.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
            </SidebarContent>
            {footer && <SidebarFooter>{footer}</SidebarFooter>}
          </Sidebar>
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar portal={portal} />
            {banner}
            <main className="flex-1 p-4 md:p-8">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon }: { label: string; value: ReactNode; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        {label}
        {Icon && <span className="brand-soft rounded-md p-1.5"><Icon className="h-4 w-4" /></span>}
      </div>
      <div className="font-display mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="brand-soft rounded-full p-3"><Icon className="h-6 w-6" /></span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
