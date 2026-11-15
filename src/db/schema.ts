// SQLite schema + migrations (tracked with PRAGMA user_version).
// Everything that talks to SQLite goes through the small `Db` interface so the same code runs on
// expo-sqlite (app) and node:sqlite (tests).

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync<T>(sql: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: any[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

const MIGRATIONS: string[] = [
  // v1 — initial schema
  `
  CREATE TABLE settings (id TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL);

  CREATE TABLE groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#4338CA',
    icon TEXT NOT NULL DEFAULT 'people',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    color TEXT NOT NULL DEFAULT '#7C3AED'
  );

  CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    company TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_customers_name ON customers(name COLLATE NOCASE);
  CREATE INDEX idx_customers_group ON customers(group_id);
  CREATE INDEX idx_customers_status ON customers(status);

  CREATE TABLE customer_tags (
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, tag_id)
  );
  CREATE INDEX idx_customer_tags_tag ON customer_tags(tag_id);

  CREATE TABLE leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    source TEXT NOT NULL DEFAULT 'other',
    stage TEXT NOT NULL DEFAULT 'new',
    value REAL NOT NULL DEFAULT 0,
    expected_close TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    closed_at INTEGER
  );
  CREATE INDEX idx_leads_stage ON leads(stage);

  CREATE TABLE activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    amount REAL NOT NULL DEFAULT 0,
    at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_activities_customer ON activities(customer_id, at);
  CREATE INDEX idx_activities_at ON activities(at);

  CREATE TABLE followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    channel TEXT NOT NULL DEFAULT 'call',
    priority TEXT NOT NULL DEFAULT 'medium',
    due_at INTEGER NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    done_at INTEGER,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_followups_due ON followups(done, due_at);
  CREATE INDEX idx_followups_customer ON followups(customer_id);

  CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    pinned INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE INDEX idx_notes_customer ON notes(customer_id);

  CREATE TABLE attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    note_id INTEGER REFERENCES notes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file TEXT NOT NULL,
    mime TEXT NOT NULL DEFAULT '',
    size INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX idx_attachments_customer ON attachments(customer_id);
  CREATE INDEX idx_attachments_note ON attachments(note_id);
  `,
];

export const SCHEMA_VERSION = MIGRATIONS.length;

export async function migrate(db: Db): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let v = row?.user_version ?? 0;
  while (v < MIGRATIONS.length) {
    const sql = MIGRATIONS[v];
    await db.withTransactionAsync(async () => {
      await db.execAsync(sql);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
    v++;
  }
}
