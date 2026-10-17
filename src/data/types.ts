export type FieldType = "text" | "number" | "date" | "select" | "multiselect" | "textarea" | "boolean";
export type FieldTier = "system" | "module" | "custom";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  tier: FieldTier;
  options?: string[];
  /** When set, the label is the tenant's term for this key (e.g. "Member"). */
  labelTerm?: string;
  /** System fields that must always be filled in. */
  required?: boolean;
  /** Custom fields only: hidden everywhere but data is kept on records. */
  deprecated?: boolean;
  /** Select/multiselect options kept on old records but not selectable. */
  retiredOptions?: string[];
  rules?: FieldRules;
}

export interface FieldRules {
  maxLength?: number;
  min?: number;
  max?: number;
  noFuture?: boolean;
  noPast?: boolean;
}

export interface EntityDef {
  key: string;
  fields: FieldDef[];
}

export interface ModuleDef {
  key: string;
  name: string;
  icon: string;
  description: string;
  dependsOn: string[];
  price: number;
  status: "active" | "beta" | "deprecated";
  core?: boolean;
  entity?: string;
}

export interface BundleDef {
  key: string;
  name: string;
  icon: string;
  description: string;
  modules: string[];
  terms: Record<string, string>;
  /** entity -> optional field keys switched on by default */
  defaultFields: Record<string, string[]>;
}

export interface PlanDef {
  key: string;
  name: string;
  price: number;
  seats: number | null;
  locations: number | null;
  features: string[];
}

export interface FieldSetting {
  enabled: boolean;
  required: boolean;
  label?: string;
}

export interface Perm {
  read: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface Role {
  id: string;
  name: string;
  perms: Record<string, Perm>;
}

export interface Tenant {
  id: string;
  name: string;
  bundle: string;
  plan: string;
  color: string;
  currency: string;
  status: "active" | "trial" | "suspended";
  signupDate: string;
  modules: string[];
  terms: Record<string, string>;
  fieldSettings: Record<string, Record<string, FieldSetting>>;
  customFields: Record<string, FieldDef[]>;
  /** entity -> ordered field keys (Field Builder order). */
  fieldOrder?: Record<string, string[]>;
  roles: Role[];
}

export interface RecordRow {
  id: string;
  createdAt: string;
  values: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  target: string;
}
