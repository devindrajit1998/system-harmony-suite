import { useEffect, useState } from "react";
import { Search, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/shell/PortalShell";
import { useTenant, useTerms } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";
import { canUndo, isRecentCheckin, localDate, membersPort } from "@/lib/operations";
import { newRow } from "@/lib/module-events";
import { validateRecord } from "@/lib/validation";
export function Checkin() {
  const tenant = useTenant();
  const { t, tp } = useTerms();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [now, setNow] = useState(Date.now());
  const all = useAppStore((s) => s.records[tenant.id]);
  const members = membersPort(tenant.id);
  const attendance = (all?.checkin ?? []).filter((r) => r.values.date === localDate());
  const upsert = useAppStore((s) => s.upsertRecord);
  const del = useAppStore((s) => s.deleteRecord);
  const log = useAppStore((s) => s.log);
  const emit = useAppStore((s) => s.emitEvent);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setSelected("");
    setQ("");
  }, [tenant.id]);
  const member = members.find((m) => m.id === selected);
  const active =
    member?.membership?.values.status === "Active" &&
    String(member.membership.values.end_date ?? "") >= localDate();
  const previous = attendance.find(
    (r) =>
      r.values.customerId === member?.id &&
      isRecentCheckin(String(r.values.at ?? r.createdAt), now),
  );
  function check() {
    if (!member || (!active && !reason.trim())) return;
    const at = new Date().toISOString();
    const values = {
      customer: member.values.name,
      customerId: member.id,
      date: localDate(),
      status: "Checked in",
      at,
      notes: reason.trim(),
      overrideReason: active ? "" : reason.trim(),
    };
    const errors = validateRecord("checkin", values);
    if (Object.keys(errors).length) {
      toast.error(Object.values(errors)[0]);
      return;
    }
    const row = newRow(values, at);
    upsert(tenant.id, "checkin", row);
    if (!active)
      log(
        tenant.name,
        `Override ${t("checkin").toLowerCase()}`,
        `${member.values.name}: ${reason.trim()}`,
      );
    emit("checkin.created", {
      tenantId: tenant.id,
      sourceId: row.id,
      customer: String(member.values.name),
    });
    toast.success(`${t("customer")} checked in`);
    setConfirm(false);
    setReason("");
  }
  return (
    <div>
      <PageHeader title={tp("checkin")} />
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <div className="relative">
            <Search className="absolute left-4 top-5 size-5 text-muted-foreground" />
            <Input
              className="h-14 pl-12 text-lg"
              aria-label={`Search ${tp("customer")}`}
              placeholder={`Search ${tp("customer").toLowerCase()} by name or phone`}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {members
              .filter(
                (m) =>
                  !q ||
                  `${m.values.name} ${m.values.phone}`.toLowerCase().includes(q.toLowerCase()),
              )
              .slice(0, q ? 30 : 8)
              .map((m) => (
                <Button
                  key={m.id}
                  variant={selected === m.id ? "default" : "outline"}
                  className="h-auto justify-start whitespace-normal p-4 text-left"
                  onClick={() => {
                    setSelected(m.id);
                    setReason("");
                  }}
                >
                  <span>
                    <strong className="block">{String(m.values.name)}</strong>
                    <small>{String(m.values.phone)}</small>
                  </span>
                </Button>
              ))}
          </div>
          {member && (
            <div className="mt-6 border-t pt-6">
              <h2 className="text-2xl font-semibold">{String(member.values.name)}</h2>
              <div className="my-4 flex flex-wrap gap-3">
                <span
                  className={`rounded-md px-3 py-1 text-sm ${active ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
                >
                  {String(member.membership?.values.status ?? "No plan")}
                </span>
                <span>
                  {String(member.membership?.values.plan ?? "—")} · Expires{" "}
                  {String(member.membership?.values.end_date ?? "—")}
                </span>
              </div>
              {previous && (
                <p className="mb-4 text-warning">
                  Already checked in at{" "}
                  {new Date(String(previous.values.at ?? previous.createdAt)).toLocaleTimeString(
                    "en",
                    { hour: "numeric", minute: "2-digit" },
                  )}
                </p>
              )}
              {active ? (
                <Button
                  className="h-14 min-w-48 text-lg"
                  onClick={() => (previous ? setConfirm(true) : check())}
                >
                  Check in
                </Button>
              ) : (
                <>
                  <Button className="mb-4 h-14" disabled>
                    Check in
                  </Button>
                  <div className="space-y-2">
                    <Label htmlFor="override-reason">Override reason</Label>
                    <Input
                      id="override-reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <Button
                      variant="destructive"
                      className="h-12"
                      disabled={!reason.trim()}
                      onClick={() => (previous ? setConfirm(true) : check())}
                    >
                      Override check-in
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </section>
        <section className="border-l pl-6">
          <h2 className="mb-5 text-lg font-semibold">
            Today's attendance{" "}
            <span className="ml-2 text-primary" aria-label="Attendance count">
              {attendance.length}
            </span>
          </h2>
          <div className="divide-y">
            {attendance
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((r) => (
                <div key={r.id} className="py-4">
                  <div className="flex items-center justify-between gap-2">
                    <strong>{String(r.values.customer)}</strong>
                    <span className="text-sm text-muted-foreground">
                      {new Date(String(r.values.at ?? r.createdAt)).toLocaleTimeString("en", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {!!r.values.overrideReason && (
                    <p className="mt-1 text-sm text-destructive">
                      Override: {String(r.values.overrideReason)}
                    </p>
                  )}
                  {canUndo(r.createdAt, now) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        del(tenant.id, "checkin", r.id);
                        toast.success(`${t("checkin")} undone`);
                      }}
                    >
                      <Undo2 className="size-3" />
                      Undo
                    </Button>
                  )}
                </div>
              ))}
            {attendance.length === 0 && (
              <p className="text-muted-foreground">No {tp("checkin").toLowerCase()} today.</p>
            )}
          </div>
        </section>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("customer")} already checked in</DialogTitle>
          </DialogHeader>
          <p>
            Confirm another {t("checkin").toLowerCase()} for {String(member?.values.name)}?
          </p>
          <Button onClick={check}>Confirm check-in</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
