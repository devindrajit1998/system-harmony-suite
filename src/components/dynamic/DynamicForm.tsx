import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ResolvedField } from "@/hooks/use-tenant";
import { validateValues } from "@/lib/validation";
import { FieldInput } from "./FieldInput";

export function DynamicForm({ fields, initial = {}, onSubmit, onCancel, submitLabel = "Save", preview }: {
  fields: ResolvedField[];
  initial?: Record<string, unknown>;
  onSubmit?: (values: Record<string, unknown>) => void;
  onCancel?: () => void;
  submitLabel?: string;
  preview?: boolean;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateValues(fields, values);
    setErrors(errs);
    if (Object.keys(errs).length === 0) onSubmit?.(values);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {fields.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label htmlFor={`f-${f.key}`} className="flex items-center gap-1">
            {f.label}
            {f.required && <span className="text-destructive">*</span>}
            {f.tier === "custom" && <span className="ml-1 rounded bg-muted px-1.5 text-[10px] font-medium uppercase text-muted-foreground">custom</span>}
          </Label>
          <FieldInput id={`f-${f.key}`} field={f} value={values[f.key]} onChange={(v) => { setValues((p) => ({ ...p, [f.key]: v })); setErrors((p) => ({ ...p, [f.key]: "" })); }} />
          {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <Button type="submit">{preview ? "Test validation" : submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}
