import { Settings2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTenant } from "@/hooks/use-tenant";
import { useAppStore } from "@/store/app-store";
export function useOperationSettings() {
  const t = useTenant();
  return (
    useAppStore((s) => s.operationSettings?.[t.id]) ?? {
      open: "09:00",
      close: "18:00",
      slot: 30,
      tax: 5,
      warning: 5,
      danger: 10,
    }
  );
}
export function OperationsSettings({ mode }: { mode: "calendar" | "pos" | "kds" }) {
  const t = useTenant();
  const settings = useOperationSettings();
  const update = useAppStore((s) => s.setOperationSettings);
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Settings">
          <Settings2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const patch =
              mode === "calendar"
                ? {
                    open: String(data.get("open")),
                    close: String(data.get("close")),
                    slot: Number(data.get("slot")),
                  }
                : mode === "pos"
                  ? { tax: Number(data.get("tax")) }
                  : { warning: Number(data.get("warning")), danger: Number(data.get("danger")) };
            if (mode === "calendar" && String(data.get("close")) <= String(data.get("open")))
              return;
            if (mode === "kds" && Number(data.get("danger")) <= Number(data.get("warning"))) return;
            update(t.id, patch);
            setOpen(false);
          }}
        >
          {mode === "calendar" ? (
            <>
              <Label htmlFor="open-hour">Business hours — opens</Label>
              <Input id="open-hour" name="open" type="time" defaultValue={settings.open} required />
              <Label htmlFor="close-hour">Closes</Label>
              <Input
                id="close-hour"
                name="close"
                type="time"
                defaultValue={settings.close}
                required
              />
              <Label htmlFor="slot-length">Slot length (minutes)</Label>
              <Input
                id="slot-length"
                name="slot"
                type="number"
                min={5}
                max={120}
                defaultValue={settings.slot}
                required
              />
            </>
          ) : mode === "pos" ? (
            <>
              <Label htmlFor="tax-rate">Tax %</Label>
              <Input
                id="tax-rate"
                name="tax"
                type="number"
                min={0}
                max={100}
                step="0.1"
                defaultValue={settings.tax}
                required
              />
            </>
          ) : (
            <>
              <Label htmlFor="warning-age">Amber after (minutes)</Label>
              <Input
                id="warning-age"
                name="warning"
                type="number"
                min={1}
                defaultValue={settings.warning}
                required
              />
              <Label htmlFor="danger-age">Red after (minutes)</Label>
              <Input
                id="danger-age"
                name="danger"
                type="number"
                min={settings.warning + 1}
                defaultValue={settings.danger}
                required
              />
            </>
          )}
          <Button type="submit">Save settings</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
