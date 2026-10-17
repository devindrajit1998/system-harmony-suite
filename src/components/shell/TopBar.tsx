import { useNavigate } from "@tanstack/react-router";
import { Moon, RotateCcw, ShieldCheck, Sun } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export function TopBar({ portal }: { portal: "super" | "tenant" }) {
  const navigate = useNavigate();
  const tenants = useAppStore((s) => s.tenants);
  const current = useAppStore((s) => s.currentTenantId);
  const setTenant = useAppStore((s) => s.setTenant);
  const stop = useAppStore((s) => s.stopImpersonating);
  const dark = useAppStore((s) => s.dark);
  const toggleDark = useAppStore((s) => s.toggleDark);
  const reset = useAppStore((s) => s.reset);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-3 backdrop-blur">
      <SidebarTrigger />
      <div className="flex items-center gap-2 text-sm">
        <span className="hidden text-muted-foreground sm:inline">Viewing as</span>
        <div className="flex items-center rounded-lg border bg-muted p-0.5">
          <button
            onClick={() => { stop(); navigate({ to: "/super" }); }}
            className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition", portal === "super" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Super Admin
          </button>
          <Select value={portal === "tenant" ? current : ""} onValueChange={(v) => { setTenant(v); navigate({ to: "/app" }); }}>
            <SelectTrigger className={cn("h-7 w-[190px] border-0 shadow-none", portal === "tenant" && "bg-background font-medium shadow-sm")}>
              <SelectValue placeholder="Tenant…" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: t.color }} />
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm"><RotateCcw className="h-4 w-4" /><span className="hidden md:inline">Reset demo data</span></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all demo data?</AlertDialogTitle>
              <AlertDialogDescription>Every tenant, module, field and record goes back to the original sample data.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { reset(); toast.success("Demo data restored"); navigate({ to: "/super" }); }}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="ghost" size="icon" onClick={toggleDark} aria-label="Toggle dark mode">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
