import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, XCircle } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { runIsolationChecks } from "@/lib/isolation";
import { useAppStore } from "@/store/app-store";

export const Route = createFileRoute("/dev/isolation")({
  head: () => ({
    meta: [
      { title: "Tenant isolation checks — Modulo" },
      { name: "description", content: "Developer page that verifies tenant data stays isolated." },
      { property: "og:title", content: "Tenant isolation checks — Modulo" },
      { property: "og:description", content: "Automatic pass/fail checks for tenant isolation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IsolationPage,
});

function IsolationPage() {
  const tenants = useAppStore((s) => s.tenants);
  const records = useAppStore((s) => s.records);
  const bundles = useAppStore((s) => s.bundles);
  const checks = useMemo(() => runIsolationChecks(tenants, records, bundles), [tenants, records, bundles]);
  const ok = checks.every((c) => c.pass);
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold">Tenant isolation</h1>
        <Badge variant={ok ? "default" : "destructive"}>{ok ? "All checks passing" : "Failures found"}</Badge>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3 p-4" data-check={c.id} data-pass={c.pass}>
            {c.pass ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-success" /> : <XCircle className="mt-0.5 h-5 w-5 text-destructive" />}
            <div className="flex-1">
              <div className="font-medium">({c.id}) {c.label}</div>
              <div className="text-sm text-muted-foreground">{c.detail}</div>
            </div>
            <Badge variant={c.pass ? "secondary" : "destructive"}>{c.pass ? "Pass" : "Fail"}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}
