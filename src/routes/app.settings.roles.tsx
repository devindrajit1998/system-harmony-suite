import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shell/PortalShell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Perm } from "@/data/types";
import { useModules, useTenant, useTerms } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/app/settings/roles")({ component: Roles });

const ACTIONS: (keyof Perm)[] = ["read", "create", "update", "delete"];

function Roles() {
  const tenant = useTenant();
  const modules = useModules();
  const { tp } = useTerms();
  const setPerm = useAppStore((s) => s.setPerm);
  const update = useAppStore((s) => s.updateTenant);
  const [roleId, setRoleId] = useState(tenant.roles[0]?.id);
  const [name, setName] = useState("");
  const role = tenant.roles.find((r) => r.id === roleId) ?? tenant.roles[0];

  const addRole = () => {
    const n = name.trim();
    if (!n) return;
    const id = n.toLowerCase().replace(/\W+/g, "-");
    update(tenant.id, (t) => { t.roles.push({ id, name: n, perms: {} }); });
    setRoleId(id); setName("");
    toast.success(`Role "${n}" added`);
  };

  return (
    <div>
      <PageHeader title="Roles & permissions" description="What each role can do in every module." actions={
        <div className="flex gap-2"><Input placeholder="New role name" value={name} onChange={(e) => setName(e.target.value)} className="w-44" /><Button onClick={addRole}><Plus className="h-4 w-4" /> Add</Button></div>
      } />
      <Tabs value={role?.id} onValueChange={setRoleId} className="mb-4">
        <TabsList>{tenant.roles.map((r) => <TabsTrigger key={r.id} value={r.id}>{r.name}</TabsTrigger>)}</TabsList>
      </Tabs>
      {role && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader><TableRow><TableHead>Module</TableHead><TableHead>Records</TableHead>{ACTIONS.map((a) => <TableHead key={a} className="text-center capitalize">{a}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {modules.map((m) => (
                <TableRow key={m.key}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">{m.entity ? tp(m.entity) : "Dashboards"}</TableCell>
                  {ACTIONS.map((a) => (
                    <TableCell key={a} className="text-center">
                      <Checkbox disabled={role.id === "owner"} checked={!!role.perms[m.key]?.[a]} onCheckedChange={(v) => setPerm(tenant.id, role.id, m.key, a, !!v)} aria-label={`${role.name} ${a} ${m.name}`} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {role.id === "owner" && <p className="border-t p-3 text-xs text-muted-foreground">The Owner role always has full access.</p>}
        </div>
      )}
    </div>
  );
}
