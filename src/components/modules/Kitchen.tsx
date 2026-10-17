import { useEffect, useRef, useState } from "react";
import { Maximize, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shell/PortalShell";
import { useTenant, useTerms } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";
import type { OrderLine } from "@/lib/module-events";
import { ticketTone } from "@/lib/operations";
import { OperationsSettings, useOperationSettings } from "./OperationsSettings";
export function Kitchen() {
  const tenant = useTenant();
  const { t, tp } = useTerms();
  const tickets = useAppStore((s) => s.records[tenant.id]?.ticket) ?? [];
  const upsert = useAppStore((s) => s.upsertRecord);
  const [served, setServed] = useState(false);
  const [now, setNow] = useState(Date.now());
  const settings = useOperationSettings();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const stages = ["New", "Preparing", "Ready", "Served"];
  return (
    <div ref={ref} className="bg-background p-1">
      <PageHeader
        title={tp("ticket")}
        actions={
          <>
            <OperationsSettings mode="kds" />
            <Button
              variant="outline"
              size="icon"
              aria-label="Fullscreen"
              onClick={() => {
                if (document.fullscreenElement) void document.exitFullscreen();
                else void ref.current?.requestFullscreen();
              }}
            >
              <Maximize className="size-4" />
            </Button>
          </>
        }
      />
      <label className="mb-6 flex items-center gap-2">
        <Switch checked={served} onCheckedChange={setServed} />
        Show served
      </label>
      <div className={`grid gap-5 md:grid-cols-3 ${served ? "xl:grid-cols-4" : ""}`}>
        {stages
          .filter((s) => served || s !== "Served")
          .map((stage, index) => (
            <section key={stage} data-column={stage}>
              <h2 className="mb-4 flex justify-between border-b pb-3 text-lg font-semibold">
                {stage}
                <span className="text-muted-foreground">
                  {tickets.filter((r) => r.values.status === stage).length}
                </span>
              </h2>
              <div className="space-y-4">
                {tickets
                  .filter((r) => r.values.status === stage)
                  .map((r) => {
                    const tone = ticketTone(r.createdAt, settings.warning, settings.danger, now);
                    const age = Math.max(
                      0,
                      Math.floor((now - new Date(r.createdAt).getTime()) / 1000),
                    );
                    return (
                      <article
                        key={r.id}
                        data-ticket={r.id}
                        data-tone={tone}
                        className={`rounded-lg border-2 p-4 ${tone === "danger" ? "border-destructive bg-destructive/10" : tone === "warning" ? "border-warning bg-warning/10" : "border-border bg-card"}`}
                      >
                        <div className="mb-2 flex justify-between text-xl font-bold">
                          <span>{String(r.values.name)}</span>
                          <time
                            className={
                              tone === "danger"
                                ? "text-destructive"
                                : tone === "warning"
                                  ? "text-warning"
                                  : "text-muted-foreground"
                            }
                          >
                            {Math.floor(age / 60)}:{String(age % 60).padStart(2, "0")}
                          </time>
                        </div>
                        <p className="mb-3 font-medium">{String(r.values.table || "Takeaway")}</p>
                        <span className="text-xs">
                          {tone === "danger" ? "Late" : tone === "warning" ? "Waiting" : "On time"}
                        </span>
                        <ul className="my-4 space-y-3">
                          {((r.values.lines ?? []) as OrderLine[]).map((l, i) => (
                            <li key={i}>
                              <strong>
                                {l.quantity} × {l.name}
                              </strong>
                              {l.note && <p className="text-sm text-muted-foreground">{l.note}</p>}
                            </li>
                          ))}
                        </ul>
                        {index < 3 && (
                          <Button
                            className="h-14 w-full text-lg"
                            onClick={() =>
                              upsert(tenant.id, "ticket", {
                                ...r,
                                values: { ...r.values, status: stages[index + 1] },
                              })
                            }
                          >
                            Mark {stages[index + 1]}
                          </Button>
                        )}
                        {index > 0 && (
                          <Button
                            variant="ghost"
                            className="mt-2 h-11 w-full"
                            onClick={() =>
                              upsert(tenant.id, "ticket", {
                                ...r,
                                values: { ...r.values, status: stages[index - 1] },
                              })
                            }
                          >
                            <Undo2 className="size-4" />
                            Recall
                          </Button>
                        )}
                      </article>
                    );
                  })}
                {tickets.filter((r) => r.values.status === stage).length === 0 && (
                  <p className="py-6 text-sm text-muted-foreground">
                    No {tp("ticket").toLowerCase()}.
                  </p>
                )}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
