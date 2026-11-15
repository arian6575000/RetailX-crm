// Backup / restore. One JSON document: { app, by, version, data: { <table>: rows[] }, files? }.
// Attachment files travel inside the backup as data URLs so a restore on a new phone is complete.
import { getDb, Repo } from './repo';
import { DEFAULT_SETTINGS } from './types';
import { CREDIT } from '../lib/brand';

export interface FileIO {
  toDataUrl(file: string): Promise<string | null>;
  fromDataUrl(dataUrl: string, nameHint: string): Promise<string>;
}

export const BACKUP_APP = 'RetailX CRM';
export const BACKUP_VERSION = 1;

// Parents before children so foreign keys hold on restore.
const TABLES = ['groups', 'tags', 'customers', 'customer_tags', 'leads', 'activities', 'followups', 'notes', 'attachments'] as const;
type Table = (typeof TABLES)[number];

export async function exportAll(files: FileIO) {
  const db = getDb();
  const data: Record<string, any[]> = {};
  for (const t of TABLES) data[t] = await db.getAllAsync<any>(`SELECT * FROM ${t} ORDER BY ${t === 'customer_tags' ? 'customer_id, tag_id' : 'id'}`);
  const blobs: Record<string, string> = {};
  for (const a of data.attachments) {
    const u = await files.toDataUrl(a.file);
    if (u) blobs[a.file] = u;
  }
  return {
    app: BACKUP_APP, by: CREDIT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(),
    settings: await Repo.getSettings(), data, files: blobs,
  };
}

export type RestoreSummary = Record<Table, number>;

export function validateBackup(p: any): string | null {
  if (!p || typeof p !== 'object') return 'invalidBackup';
  if (p.app !== BACKUP_APP) return 'notRetailXBackup';
  if (!p.data || typeof p.data !== 'object') return 'invalidBackup';
  for (const t of TABLES) if (p.data[t] !== undefined && !Array.isArray(p.data[t])) return 'invalidBackup';
  return null;
}

const COLS: Record<Table, string[]> = {
  groups: ['id', 'name', 'color', 'icon', 'created_at'],
  tags: ['id', 'name', 'color'],
  customers: ['id', 'name', 'company', 'phone', 'email', 'city', 'address', 'status', 'group_id', 'notes', 'created_at', 'updated_at'],
  customer_tags: ['customer_id', 'tag_id'],
  leads: ['id', 'customer_id', 'name', 'phone', 'source', 'stage', 'value', 'expected_close', 'notes', 'created_at', 'updated_at', 'closed_at'],
  activities: ['id', 'customer_id', 'lead_id', 'type', 'title', 'body', 'amount', 'at', 'created_at'],
  followups: ['id', 'customer_id', 'lead_id', 'title', 'notes', 'channel', 'priority', 'due_at', 'done', 'done_at', 'created_at'],
  notes: ['id', 'customer_id', 'title', 'body', 'pinned', 'created_at', 'updated_at'],
  attachments: ['id', 'customer_id', 'note_id', 'name', 'file', 'mime', 'size', 'created_at'],
};

/**
 * replace: wipe everything, then load the backup with the original ids.
 * merge: keep existing data; backup rows get fresh ids (relations are remapped), duplicate tags are reused.
 */
export async function importAll(p: any, mode: 'merge' | 'replace', files: FileIO): Promise<RestoreSummary> {
  const bad = validateBackup(p);
  if (bad) throw new Error(bad);
  const db = getDb();
  const summary = Object.fromEntries(TABLES.map((t) => [t, 0])) as RestoreSummary;

  // Re-create attachment files first (outside the DB transaction); remember the new file names.
  const fileMap = new Map<string, string>();
  for (const a of p.data.attachments || []) {
    const url = p.files?.[a.file];
    if (typeof url === 'string' && url.startsWith('data:')) { try { fileMap.set(a.file, await files.fromDataUrl(url, String(a.name || 'file'))); } catch { /* skip unreadable file */ } }
  }

  await db.withTransactionAsync(async () => {
    if (mode === 'replace') await Repo.eraseAll(true);
    const idMap: Record<string, Map<number, number>> = {};
    const remap = (t: string, old: any) => (old == null ? null : idMap[t]?.get(Number(old)) ?? null);

    for (const t of TABLES) {
      idMap[t] = new Map();
      for (const row of p.data[t] || []) {
        const r: any = { ...row };
        if (t === 'attachments') { if (!fileMap.has(r.file)) continue; r.file = fileMap.get(r.file); }
        if (mode === 'merge' || t === 'customer_tags') {
          // relations → new ids
          if ('group_id' in r) r.group_id = remap('groups', r.group_id);
          if ('customer_id' in r) r.customer_id = remap('customers', r.customer_id);
          if ('lead_id' in r) r.lead_id = remap('leads', r.lead_id);
          if ('note_id' in r) r.note_id = remap('notes', r.note_id);
          if (t === 'customer_tags') { r.tag_id = remap('tags', r.tag_id); if (r.customer_id == null || r.tag_id == null) continue; }
        }
        if (t === 'tags') {
          const ex = await db.getFirstAsync<{ id: number }>('SELECT id FROM tags WHERE name = ? COLLATE NOCASE', [r.name]);
          if (ex) { idMap[t].set(Number(row.id), ex.id); continue; }
        }
        const cols = COLS[t].filter((c) => !(mode === 'merge' && c === 'id') && c in r);
        const res = await db.runAsync(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => r[c] ?? null));
        if (row.id != null) idMap[t].set(Number(row.id), mode === 'merge' ? res.lastInsertRowId : Number(row.id));
        summary[t]++;
      }
    }
  });

  if (mode === 'replace' && p.settings) await Repo.saveSettings({ ...DEFAULT_SETTINGS, ...p.settings });
  return summary;
}
