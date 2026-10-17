import { pageHead } from '@/lib/page-head';
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { useState } from "react";
import { EmptyState, PageHeader } from "@/components/shell/PortalShell";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/super/audit")({ head: () => pageHead('Platform audit log', 'Review changes across tenant workspaces.'), component: AuditPage });

function AuditPage() {
  const audit = useAppStore((s) => s.audit);
  const [q, setQ] = useState("");
  const rows = audit.filter((a) => `${a.actor} ${a.action} ${a.target}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <PageHeader title="Audit log" description="Every change across the platform, newest first." actions={<Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />} />
      {rows.length === 0 ? <EmptyState icon={ScrollText} title="No activity found" /> : (
        <ol className="relative space-y-1 border-l pl-6">
          {rows.slice(0, 100).map((a) => (
            <li key={a.id} className="relative rounded-lg py-2 text-sm">
              <span className="absolute -left-[29px] top-3.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
              <span className="font-medium">{a.actor}</span> <span className="text-muted-foreground">{a.action}</span> <span className="font-medium">{a.target}</span>
              <div className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
