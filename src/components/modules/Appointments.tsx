import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicForm } from "@/components/dynamic/DynamicForm";
import { PageHeader } from "@/components/shell/PortalShell";
import { useFields, useTenant, useTerms } from "@/hooks/use-tenant";
import type { RecordRow } from "@/data/types";
import { useAppStore } from "@/store/app-store";
import { clock, minuteOfDay, overlaps, staffPort, servicePort, localDate } from "@/lib/operations";
import { newRow } from "@/lib/module-events";
import { validateRecord } from '@/lib/validation';
import { OperationsSettings, useOperationSettings } from "./OperationsSettings";
const staffColors = [
  "border-chart-1",
  "border-chart-2",
  "border-chart-3",
  "border-chart-4",
  "border-chart-5",
];
const statusClasses: Record<string, string> = {
  Confirmed: "bg-success/15 text-success",
  Pending: "bg-warning/15 text-foreground",
  Completed: "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/15 text-destructive",
};
export function Appointments() {
  const tenant = useTenant();
  const { t, tp } = useTerms();
  const settings = useOperationSettings();
  const fields = useFields("appointment");
  const records = useAppStore((s) => s.records[tenant.id]?.appointment) ?? [];
  const allRecords = useAppStore((s) => s.records[tenant.id]);
  const staff = staffPort(tenant.id);
  const services = tenant.modules.includes("services") ? servicePort(tenant.id) : [];
  const upsert = useAppStore((s) => s.upsertRecord);
  const emit = useAppStore((s) => s.emitEvent);
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<"Day" | "Week" | "List">("Week");
  const [filtered, setFiltered] = useState<string[]>([]);
  const [edit, setEdit] = useState<RecordRow | null>(null);
  const [cancel, setCancel] = useState<RecordRow | null>(null);
  const [reason, setReason] = useState("");
  const [chosenService, setChosenService] = useState("");
  const [chosenStaff, setChosenStaff] = useState("");
  useEffect(() => {
    setEdit(null);
    setFiltered([]);
  }, [tenant.id]);
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const days =
    view === "Day"
      ? [date]
      : Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setDate(d.getDate() + i);
          return d;
        });
  const visible = records.filter((r) => !filtered.includes(String(r.values.staff)));
  const slots = Array.from(
    {
      length: Math.max(
        0,
        Math.ceil((minuteOfDay(settings.close) - minuteOfDay(settings.open)) / settings.slot),
      ),
    },
    (_, i) => clock(minuteOfDay(settings.open) + i * settings.slot),
  );
  const formFields = fields.filter((f) => f.key !== "staff" && f.key !== "service");
  function open(row: RecordRow) {
    setChosenStaff(String(row.values.staff ?? staff[0]?.values.name ?? ""));
    setChosenService(String(row.values.service ?? ""));
    setEdit(row);
  }
  function save(values: Record<string, unknown>) {
    if (!edit) return;
    const service = services.find((r) => r.id === chosenService || r.values.name === chosenService);
    const row = {
      ...edit,
      values: {
        ...edit.values,
        ...values,
        staff: chosenStaff,
        service: service?.values.name,
        duration_min: service
          ? Number(service.values.duration_min ?? 30)
          : Number(values.duration_min ?? edit.values.duration_min ?? 30),
        amount: service?.values.price ?? edit.values.amount ?? 0,
      },
    };
    if (!chosenStaff) {
      toast.error(`Choose a ${t("staff").toLowerCase()}`);
      return;
    }
    const errs=validateRecord('appointment',row.values);
    if(Object.keys(errs).length){toast.error(Object.values(errs)[0]);return;}
    if (overlaps(records, row)) {
      toast.error(
        `Overlapping ${t("appointment").toLowerCase()} for this ${t("staff").toLowerCase()}`,
      );
      return;
    }
    upsert(tenant.id, "appointment", row);
    if(row.values.status==='Completed' && edit.values.status!=='Completed') emit('appointment.completed',{tenantId:tenant.id,sourceId:row.id,customer:String(row.values.customer),amount:Number(row.values.amount??0)});
    setEdit(null);
    toast.success(`${t("appointment")} saved`);
  }
  function reschedule(id: string, d: string, time: string, staffName: string) {
    const old = records.find((r) => r.id === id);
    if (!old) return;
    const row = { ...old, values: { ...old.values, date: d, time, staff: staffName } };
    if(Object.keys(validateRecord('appointment',row.values)).length){toast.error(`${t('appointment')} has invalid fields`);return;}
    if (overlaps(records, row)) {
      toast.error(`Overlapping ${t("appointment").toLowerCase()} — moved back`);
      return;
    }
    upsert(tenant.id, "appointment", row);
    toast.success(`${t("appointment")} rescheduled`);
  }
  function status(row: RecordRow, next: string) {
    upsert(tenant.id, "appointment", { ...row, values: { ...row.values, status: next } });
    if (next === "Completed")
      emit("appointment.completed", {
        tenantId: tenant.id,
        sourceId: row.id,
        customer: String(row.values.customer),
        amount: Number(row.values.amount ?? 0),
      });
    toast.success(`${t("appointment")} ${next.toLowerCase()}`);
    setEdit(null);
  }
  const add = (
    d = localDate(date),
    time = settings.open,
    staffName = String(staff[0]?.values.name ?? ""),
  ) =>
    open(
      newRow({ date: d, time, staff: staffName, status: "Pending", duration_min: settings.slot }),
    );
  const block = (r: RecordRow) => (
    <div
      key={r.id}
      draggable={r.values.status !== "Cancelled"}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", r.id);
      }}
      data-appointment={r.id}
      className={`my-1 cursor-grab rounded-md border-l-4 p-2 text-xs ${
        staffColors[
          Math.max(
            0,
            staff.findIndex((s) => s.values.name === r.values.staff),
          ) % 5
        ]
      } ${statusClasses[String(r.values.status)] ?? "bg-muted"}`}
    >
      <Button
        variant="ghost"
        className="h-auto w-full justify-start whitespace-normal p-0 text-left text-current"
        onClick={() => open(r)}
      >
        <span>
          <strong>{String(r.values.customer)}</strong>
          <span className="block">
            {String(r.values.time)}–
            {clock(minuteOfDay(String(r.values.time)) + Number(r.values.duration_min ?? 30))} ·{" "}
            {String(r.values.staff)}
          </span>
          <span className="block">{String(r.values.status)}</span>
        </span>
      </Button>
    </div>
  );
  return (
    <div>
      <PageHeader
        title={tp("appointment")}
        actions={
          <>
            <OperationsSettings mode="calendar" />
            <Button onClick={() => add()}>
              <Plus className="size-4" />
              Add {t("appointment").toLowerCase()}
            </Button>
          </>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous period"
          onClick={() => {
            const d = new Date(date);
            d.setDate(d.getDate() - (view === "Day" ? 1 : 7));
            setDate(d);
          }}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" onClick={() => setDate(new Date())}>
          Today
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next period"
          onClick={() => {
            const d = new Date(date);
            d.setDate(d.getDate() + (view === "Day" ? 1 : 7));
            setDate(d);
          }}
        >
          <ChevronRight className="size-4" />
        </Button>
        <strong>{date.toLocaleDateString("en", { month: "long", year: "numeric" })}</strong>
        <div className="ml-auto flex">
          {(["Day", "Week", "List"] as const).map((v) => (
            <Button key={v} variant={view === v ? "default" : "outline"} onClick={() => setView(v)}>
              {v}
            </Button>
          ))}
        </div>
      </div>
      <div className="grid gap-5 xl:grid-cols-[250px_1fr]">
        <aside>
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(d)}
            className="rounded-md border"
          />
          <h2 className="my-4 font-semibold">{tp("staff")}</h2>
          {staff.map((s, i) => (
            <label
              key={s.id}
              className={`mb-3 flex items-center gap-2 border-l-4 pl-2 ${staffColors[i % 5]}`}
            >
              <Checkbox
                checked={!filtered.includes(String(s.values.name))}
                onCheckedChange={(on) =>
                  setFiltered((prev) =>
                    on ? prev.filter((n) => n !== s.values.name) : [...prev, String(s.values.name)],
                  )
                }
              />
              {String(s.values.name)}
            </label>
          ))}
        </aside>
        <div className="min-w-0 overflow-x-auto">
          {records.length === 0 && (
            <p className="mb-4 text-muted-foreground">No {tp("appointment").toLowerCase()} yet.</p>
          )}
          {view === "List" ? (
            <div className="divide-y">
              {visible
                .filter((r) => days.some((d) => localDate(d) === r.values.date))
                .sort((a, b) =>
                  (String(a.values.date) + String(a.values.time)).localeCompare(
                    String(b.values.date) + String(b.values.time),
                  ),
                )
                .map((r) => (
                  <div className="py-2" key={r.id}>
                    <small>{String(r.values.date)}</small>
                    {block(r)}
                  </div>
                ))}
            </div>
          ) : (
            <div className="min-w-[700px] border">
              <div
                className={`calendar-row grid ${view === "Day" ? "grid-cols-[60px_1fr]" : "grid-cols-[60px_repeat(7,minmax(0,1fr))]"}`}
              >
                <div />
                {days.map((d) => (
                  <div
                    key={localDate(d)}
                    className="border-l bg-muted p-2 text-center text-xs font-semibold"
                  >
                    {d.toLocaleDateString("en", { weekday: "short", day: "numeric" })}
                  </div>
                ))}
              </div>
              {slots.map((time) => (
                <div
                  key={time}
                  className={`grid border-t ${view === "Day" ? "grid-cols-[60px_1fr]" : "grid-cols-[60px_repeat(7,minmax(0,1fr))]"}`}
                >
                  <span className="p-2 text-xs text-muted-foreground">{time}</span>
                  {days.map((d) => (
                    <div key={localDate(d)} className="min-h-14 border-l p-1">
                      {(staff.length ? staff : [{ id: "none", values: { name: "" } }])
                        .filter((s) => !filtered.includes(String(s.values.name)))
                        .map((s) => (
                          <div
                            key={s.id}
                            data-slot={`${localDate(d)}-${time}-${s.id}`}
                            aria-label={`${localDate(d)} ${time} ${s.values.name}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              reschedule(
                                e.dataTransfer.getData("text/plain"),
                                localDate(d),
                                time,
                                String(s.values.name),
                              );
                            }}
                            className="min-h-7"
                          >
                            {visible
                              .filter(
                                (r) =>
                                  r.values.date === localDate(d) &&
                                  r.values.time === time &&
                                  r.values.staff === s.values.name,
                              )
                              .map(block)}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-full justify-start text-[10px] text-muted-foreground"
                              aria-label={`Add ${t("appointment")} ${localDate(d)} ${time} ${s.values.name}`}
                              onClick={() => add(localDate(d), time, String(s.values.name))}
                            >
                              + {String(s.values.name).split(" ")[0] || t("appointment")}
                            </Button>
                          </div>
                        ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("appointment")}</SheetTitle>
            <SheetDescription>
              {edit?.values.date as string} · {edit?.values.time as string}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6">
            <Label>
              {t("staff")}
              <select
                aria-label={t("staff")}
                className="mt-1 h-9 w-full rounded-md border bg-background px-2"
                value={chosenStaff}
                onChange={(e) => setChosenStaff(e.target.value)}
              >
                <option value="">Select…</option>
                {staff.map((s) => (
                  <option key={s.id} value={String(s.values.name)}>
                    {String(s.values.name)}
                  </option>
                ))}
              </select>
            </Label>
            {tenant.modules.includes("services") && (
              <Label>
                {t("service")}
                <select
                  aria-label={t("service")}
                  className="mt-1 h-9 w-full rounded-md border bg-background px-2"
                  value={chosenService}
                  onChange={(e) => setChosenService(e.target.value)}
                >
                  <option value="">Select…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {String(s.values.name)} · {String(s.values.duration_min)} min
                    </option>
                  ))}
                </select>
              </Label>
            )}
            {edit && (
              <DynamicForm
                key={edit.id}
                fields={formFields}
                initial={edit.values}
                onSubmit={save}
                onCancel={() => setEdit(null)}
              />
            )}{" "}
            {edit && allRecords?.appointment?.some((r) => r.id === edit.id) && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  disabled={["Completed", "Cancelled"].includes(String(edit.values.status))}
                  onClick={() => edit && status(edit, "Confirmed")}
                >
                  Confirm
                </Button>
                <Button
                  disabled={["Completed", "Cancelled"].includes(String(edit.values.status))}
                  onClick={() => edit && status(edit, "Completed")}
                >
                  Complete
                </Button>
                <Button
                  variant="destructive"
                  disabled={edit.values.status === "Cancelled"}
                  onClick={() => {
                    setCancel(edit);
                    setReason("");
                  }}
                >
                  Cancel {t("appointment").toLowerCase()}
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <Dialog open={!!cancel} onOpenChange={(o) => !o && setCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {t("appointment").toLowerCase()}</DialogTitle>
          </DialogHeader>
          <Label htmlFor="cancel-reason">Reason</Label>
          <Input id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button
            disabled={!reason.trim()}
            onClick={() => {
              if (!cancel || !reason.trim()) return;
              upsert(tenant.id, "appointment", {
                ...cancel,
                values: { ...cancel.values, status: "Cancelled", cancelReason: reason.trim() },
              });
              setCancel(null);
              setEdit(null);
            }}
          >
            Confirm cancellation
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
