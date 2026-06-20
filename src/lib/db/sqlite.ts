import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let instance: Database.Database | null = null;

export function getSqlite() {
  if (instance) return instance;

  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(path.join(dataDir, "meta.db"));
  const schema = fs.readFileSync(path.join(process.cwd(), "src", "lib", "db", "schema.sql"), "utf8");
  db.exec(schema);
  instance = db;
  return db;
}
