import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FieldDef } from "@/data/types";

export function FieldInput({ field, value, onChange, id }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; id: string }) {
  switch (field.type) {
    case "textarea":
      return <Textarea id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={3} />;
    case "number":
      return <Input id={id} type="number" value={value === undefined || value === null ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />;
    case "date":
      return <Input id={id} type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
    case "boolean":
      return <div className="flex h-9 items-center"><Switch id={id} checked={!!value} onCheckedChange={onChange} /></div>;
    case "select":
      return (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={id}><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>{(field.options ?? []).filter(Boolean).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
        </Select>
      );
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-3 rounded-md border px-3 py-2">
          {(field.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={arr.includes(o)} onCheckedChange={(c) => onChange(c ? [...arr, o] : arr.filter((x) => x !== o))} />
              {o}
            </label>
          ))}
        </div>
      );
    }
    default:
      return <Input id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} />;
  }
}

export function formatValue(field: FieldDef, v: unknown, currency?: string): string {
  if (v === undefined || v === null || v === "") return "—";
  if (field.type === "boolean") return v ? "Yes" : "No";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (field.type === "number" && currency && ["price", "total", "amount"].includes(field.key))
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(v));
  if (field.type === "date") return new Date(String(v)).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
  return String(v);
}
