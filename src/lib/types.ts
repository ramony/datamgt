export type ConnectionRecord = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  password_encrypted?: string;
  default_database?: string | null;
  color?: string | null;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
};

export type ColumnInfo = {
  Field: string;
  Type: string;
  Null: "YES" | "NO";
  Key: string;
  Default: string | number | null;
  Extra: string;
  Comment?: string;
};

export type TableSummary = {
  name: string;
  rows: number;
  comment: string;
};

export type QueryResult = {
  sql: string;
  rows: unknown[];
  fields?: string[];
  affectedRows?: number;
  durationMs: number;
  error?: string;
};
