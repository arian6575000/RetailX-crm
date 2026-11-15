// RetailX CRM data layer (offline, SQLite).
import type { Db } from './schema';
import { migrate } from './schema';
import {
  Activity, ActivityType, Attachment, Customer, CustomerStatus, DEFAULT_SETTINGS, FollowUp, Group, Lead, LeadStage,
  Note, OPEN_STAGES, Priority, Settings, STAGE_PROBABILITY, Tag,
} from './types';

let db: Db;
export async function initRepo(d: Db) { db = d; await migrate(d); }
export const getDb = () => db;

const bool = (v: any) => (v ? 1 : 0);
const parseJson = <T,>(s: any, fallback: T): T => { try { return s ? JSON.parse(s) : fallback; } catch { return fallback; } };
const now = () => Date.now();
const like = (q: string) => `%${q.replace(/[\\%_]/g, (m) => '\\' + m)}%`;

// ---------- row mappers ----------
const toCustomer = (r: any): Customer => ({
  id: r.id, name: r.name, company: r.company || '', phone: r.phone || '', email: r.email || '', city: r.city || '', address: r.address || '',
  status: (r.status || 'active') as CustomerStatus, groupId: r.group_id ?? null, notes: r.notes || '', createdAt: r.created_at, updatedAt: r.updated_at,
});
const toGroup = (r: any): Group => ({ id: r.id, name: r.name, color: r.color, icon: r.icon, createdAt: r.created_at, count: r.cnt ?? undefined });
const toTag = (r: any): Tag => ({ id: r.id, name: r.name, color: r.color, count: r.cnt ?? undefined });
const toLead = (r: any): Lead => ({
  id: r.id, customerId: r.customer_id ?? null, name: r.name, phone: r.phone || '', source: r.source || 'other', stage: r.stage as LeadStage,
  value: r.value || 0, expectedClose: r.expected_close || '', notes: r.notes || '', createdAt: r.created_at, updatedAt: r.updated_at, closedAt: r.closed_at ?? null,
});
const toActivity = (r: any): Activity => ({
  id: r.id, customerId: r.customer_id ?? null, leadId: r.lead_id ?? null, type: r.type as ActivityType, title: r.title || '', body: r.body || '',
  amount: r.amount || 0, at: r.at, createdAt: r.created_at,
});
const toFollowUp = (r: any): FollowUp => ({
  id: r.id, customerId: r.customer_id ?? null, leadId: r.lead_id ?? null, title: r.title, notes: r.notes || '', channel: (r.channel || 'call') as ActivityType,
  priority: (r.priority || 'medium') as Priority, dueAt: r.due_at, done: !!r.done, doneAt: r.done_at ?? null, createdAt: r.created_at,
});
const toNote = (r: any): Note => ({ id: r.id, customerId: r.customer_id ?? null, title: r.title || '', body: r.body || '', pinned: !!r.pinned, createdAt: r.created_at, updatedAt: r.updated_at });
const toAttachment = (r: any): Attachment => ({ id: r.id, customerId: r.customer_id ?? null, noteId: r.note_id ?? null, name: r.name, file: r.file, mime: r.mime || '', size: r.size || 0, createdAt: r.created_at });

export interface CustomerFilter { q?: string; status?: CustomerStatus | 'all'; groupId?: number | null; tagId?: number | null }

export const Repo = {
  // ---------------- Settings ----------------
  async getSettings(): Promise<Settings> {
    const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM settings WHERE id = ?', ['main']);
    if (!row) { await db.runAsync('INSERT INTO settings (id, data) VALUES (?, ?)', ['main', JSON.stringify(DEFAULT_SETTINGS)]); return { ...DEFAULT_SETTINGS }; }
    return { ...DEFAULT_SETTINGS, ...parseJson<Partial<Settings>>(row.data, {}) };
  },
  async saveSettings(s: Settings) {
    await db.runAsync('INSERT INTO settings (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data', ['main', JSON.stringify(s)]);
  },
  async markBackup() { const s = await Repo.getSettings(); await Repo.saveSettings({ ...s, lastBackupAt: now() }); },

  // ---------------- Customers ----------------
  async listCustomers(f: CustomerFilter = {}): Promise<Customer[]> {
    const where: string[] = []; const p: any[] = [];
    if (f.q?.trim()) { where.push("(c.name LIKE ? ESCAPE '\\' OR c.company LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.city LIKE ? ESCAPE '\\')"); const l = like(f.q.trim()); p.push(l, l, l, l, l); }
    if (f.status && f.status !== 'all') { where.push('c.status = ?'); p.push(f.status); }
    if (f.groupId != null) { where.push('c.group_id = ?'); p.push(f.groupId); }
    if (f.tagId != null) { where.push('EXISTS (SELECT 1 FROM customer_tags ct WHERE ct.customer_id = c.id AND ct.tag_id = ?)'); p.push(f.tagId); }
    const rows = await db.getAllAsync<any>(`SELECT c.* FROM customers c ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.name COLLATE NOCASE`, p);
    const customers = rows.map(toCustomer);
    if (customers.length) {
      const tagRows = await db.getAllAsync<any>('SELECT ct.customer_id, t.id, t.name, t.color FROM customer_tags ct JOIN tags t ON t.id = ct.tag_id ORDER BY t.name COLLATE NOCASE');
      const m = new Map<number, Tag[]>();
      tagRows.forEach((r) => { if (!m.has(r.customer_id)) m.set(r.customer_id, []); m.get(r.customer_id)!.push({ id: r.id, name: r.name, color: r.color }); });
      customers.forEach((c) => { c.tags = m.get(c.id) || []; });
    }
    return customers;
  },
  async getCustomer(id: number): Promise<Customer | null> {
    const r = await db.getFirstAsync<any>('SELECT * FROM customers WHERE id = ?', [id]);
    if (!r) return null;
    const c = toCustomer(r);
    c.tags = (await db.getAllAsync<any>('SELECT t.* FROM customer_tags ct JOIN tags t ON t.id = ct.tag_id WHERE ct.customer_id = ? ORDER BY t.name COLLATE NOCASE', [id])).map(toTag);
    return c;
  },
  async customerMap(): Promise<Record<number, Customer>> {
    const out: Record<number, Customer> = {};
    (await db.getAllAsync<any>('SELECT * FROM customers')).forEach((r) => { out[r.id] = toCustomer(r); });
    return out;
  },
  async saveCustomer(c: Partial<Customer> & { name: string }, tagIds?: number[]): Promise<number> {
    const t = now();
    let id = c.id;
    await db.withTransactionAsync(async () => {
      if (id) {
        await db.runAsync(
          'UPDATE customers SET name=?, company=?, phone=?, email=?, city=?, address=?, status=?, group_id=?, notes=?, updated_at=? WHERE id=?',
          [c.name.trim(), c.company || '', c.phone || '', c.email || '', c.city || '', c.address || '', c.status || 'active', c.groupId ?? null, c.notes || '', t, id],
        );
      } else {
        const r = await db.runAsync(
          'INSERT INTO customers (name, company, phone, email, city, address, status, group_id, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [c.name.trim(), c.company || '', c.phone || '', c.email || '', c.city || '', c.address || '', c.status || 'active', c.groupId ?? null, c.notes || '', t, t],
        );
        id = r.lastInsertRowId;
      }
      if (tagIds) {
        await db.runAsync('DELETE FROM customer_tags WHERE customer_id = ?', [id!]);
        for (const tid of new Set(tagIds)) await db.runAsync('INSERT OR IGNORE INTO customer_tags (customer_id, tag_id) VALUES (?,?)', [id!, tid]);
      }
    });
    return id!;
  },
  async setCustomerStatus(id: number, status: CustomerStatus) { await db.runAsync('UPDATE customers SET status=?, updated_at=? WHERE id=?', [status, now(), id]); },
  async deleteCustomer(id: number) { await db.runAsync('DELETE FROM customers WHERE id = ?', [id]); },
  /** Customers whose phone number (digits only) already exists — used by import to skip duplicates. */
  async existingPhones(): Promise<Set<string>> {
    const rows = await db.getAllAsync<{ phone: string }>("SELECT phone FROM customers WHERE phone <> ''");
    return new Set(rows.map((r) => r.phone.replace(/\D/g, '')).filter(Boolean));
  },

  // ---------------- Groups ----------------
  async listGroups(): Promise<Group[]> {
    return (await db.getAllAsync<any>('SELECT g.*, (SELECT COUNT(*) FROM customers c WHERE c.group_id = g.id) AS cnt FROM groups g ORDER BY g.name COLLATE NOCASE')).map(toGroup);
  },
  async saveGroup(g: { id?: number; name: string; color: string; icon: string }): Promise<number> {
    if (g.id) { await db.runAsync('UPDATE groups SET name=?, color=?, icon=? WHERE id=?', [g.name.trim(), g.color, g.icon, g.id]); return g.id; }
    return (await db.runAsync('INSERT INTO groups (name, color, icon, created_at) VALUES (?,?,?,?)', [g.name.trim(), g.color, g.icon, now()])).lastInsertRowId;
  },
  async deleteGroup(id: number) { await db.runAsync('DELETE FROM groups WHERE id = ?', [id]); },

  // ---------------- Tags ----------------
  async listTags(): Promise<Tag[]> {
    return (await db.getAllAsync<any>('SELECT t.*, (SELECT COUNT(*) FROM customer_tags ct WHERE ct.tag_id = t.id) AS cnt FROM tags t ORDER BY t.name COLLATE NOCASE')).map(toTag);
  },
  /** Create-or-get by name (case-insensitive). */
  async upsertTag(name: string, color = '#7C3AED'): Promise<number> {
    const n = name.trim();
    const ex = await db.getFirstAsync<{ id: number }>('SELECT id FROM tags WHERE name = ? COLLATE NOCASE', [n]);
    if (ex) return ex.id;
    return (await db.runAsync('INSERT INTO tags (name, color) VALUES (?, ?)', [n, color])).lastInsertRowId;
  },
  async updateTag(id: number, name: string, color: string) { await db.runAsync('UPDATE tags SET name=?, color=? WHERE id=?', [name.trim(), color, id]); },
  async deleteTag(id: number) { await db.runAsync('DELETE FROM tags WHERE id = ?', [id]); },

  // ---------------- Leads / pipeline ----------------
  async listLeads(stage?: LeadStage): Promise<Lead[]> {
    const rows = stage
      ? await db.getAllAsync<any>('SELECT * FROM leads WHERE stage = ? ORDER BY updated_at DESC', [stage])
      : await db.getAllAsync<any>('SELECT * FROM leads ORDER BY updated_at DESC');
    return rows.map(toLead);
  },
  async getLead(id: number): Promise<Lead | null> {
    const r = await db.getFirstAsync<any>('SELECT * FROM leads WHERE id = ?', [id]);
    return r ? toLead(r) : null;
  },
  async saveLead(l: Partial<Lead> & { name: string }): Promise<number> {
    const t = now();
    const stage = l.stage || 'new';
    const closedAt = stage === 'won' || stage === 'lost' ? (l.closedAt ?? t) : null;
    if (l.id) {
      await db.runAsync(
        'UPDATE leads SET customer_id=?, name=?, phone=?, source=?, stage=?, value=?, expected_close=?, notes=?, updated_at=?, closed_at=? WHERE id=?',
        [l.customerId ?? null, l.name.trim(), l.phone || '', l.source || 'other', stage, l.value || 0, l.expectedClose || '', l.notes || '', t, closedAt, l.id],
      );
      return l.id;
    }
    return (await db.runAsync(
      'INSERT INTO leads (customer_id, name, phone, source, stage, value, expected_close, notes, created_at, updated_at, closed_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [l.customerId ?? null, l.name.trim(), l.phone || '', l.source || 'other', stage, l.value || 0, l.expectedClose || '', l.notes || '', t, t, closedAt],
    )).lastInsertRowId;
  },
  async moveLead(id: number, stage: LeadStage) {
    const t = now();
    await db.runAsync('UPDATE leads SET stage=?, updated_at=?, closed_at=? WHERE id=?', [stage, t, stage === 'won' || stage === 'lost' ? t : null, id]);
    await Repo.addActivity({ leadId: id, customerId: (await Repo.getLead(id))?.customerId ?? null, type: 'note', title: `Moved to ${stage}`, body: '' });
  },
  async deleteLead(id: number) { await db.runAsync('DELETE FROM leads WHERE id = ?', [id]); },
  /** Turn a lead into a customer (or link to the existing one) and mark it won. Returns the customer id. */
  async convertLead(id: number): Promise<number> {
    const l = await Repo.getLead(id);
    if (!l) throw new Error('Lead not found');
    let cid = l.customerId;
    if (!cid) {
      cid = await Repo.saveCustomer({ name: l.name, phone: l.phone, status: 'active', notes: l.notes });
      await db.runAsync('UPDATE leads SET customer_id=? WHERE id=?', [cid, id]);
    }
    await Repo.moveLead(id, 'won');
    await db.runAsync('UPDATE activities SET customer_id = ? WHERE lead_id = ? AND customer_id IS NULL', [cid, id]);
    await db.runAsync('UPDATE followups SET customer_id = ? WHERE lead_id = ? AND customer_id IS NULL', [cid, id]);
    return cid;
  },

  // ---------------- Activities (timeline) ----------------
  async listActivities(o: { customerId?: number; leadId?: number; limit?: number } = {}): Promise<Activity[]> {
    const where: string[] = []; const p: any[] = [];
    if (o.customerId != null) { where.push('customer_id = ?'); p.push(o.customerId); }
    if (o.leadId != null) { where.push('lead_id = ?'); p.push(o.leadId); }
    p.push(o.limit ?? 500);
    return (await db.getAllAsync<any>(`SELECT * FROM activities ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY at DESC, id DESC LIMIT ?`, p)).map(toActivity);
  },
  async addActivity(a: { customerId?: number | null; leadId?: number | null; type: ActivityType; title: string; body?: string; amount?: number; at?: number }): Promise<number> {
    const t = now();
    return (await db.runAsync('INSERT INTO activities (customer_id, lead_id, type, title, body, amount, at, created_at) VALUES (?,?,?,?,?,?,?,?)',
      [a.customerId ?? null, a.leadId ?? null, a.type, a.title, a.body || '', a.amount || 0, a.at ?? t, t])).lastInsertRowId;
  },
  async deleteActivity(id: number) { await db.runAsync('DELETE FROM activities WHERE id = ?', [id]); },

  // ---------------- Follow-ups ----------------
  async listFollowUps(o: { done?: boolean; customerId?: number } = {}): Promise<FollowUp[]> {
    const where: string[] = []; const p: any[] = [];
    if (o.done != null) { where.push('done = ?'); p.push(bool(o.done)); }
    if (o.customerId != null) { where.push('customer_id = ?'); p.push(o.customerId); }
    const order = o.done ? 'done_at DESC' : 'due_at ASC';
    return (await db.getAllAsync<any>(`SELECT * FROM followups ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${order}`, p)).map(toFollowUp);
  },
  async saveFollowUp(f: Partial<FollowUp> & { title: string; dueAt: number }): Promise<number> {
    if (f.id) {
      await db.runAsync('UPDATE followups SET customer_id=?, lead_id=?, title=?, notes=?, channel=?, priority=?, due_at=? WHERE id=?',
        [f.customerId ?? null, f.leadId ?? null, f.title.trim(), f.notes || '', f.channel || 'call', f.priority || 'medium', f.dueAt, f.id]);
      return f.id;
    }
    return (await db.runAsync('INSERT INTO followups (customer_id, lead_id, title, notes, channel, priority, due_at, done, created_at) VALUES (?,?,?,?,?,?,?,0,?)',
      [f.customerId ?? null, f.leadId ?? null, f.title.trim(), f.notes || '', f.channel || 'call', f.priority || 'medium', f.dueAt, now()])).lastInsertRowId;
  },
  /** Mark done (logging the outcome to the timeline) or reopen. */
  async completeFollowUp(id: number, done = true) {
    const r = await db.getFirstAsync<any>('SELECT * FROM followups WHERE id = ?', [id]);
    if (!r) return;
    await db.runAsync('UPDATE followups SET done=?, done_at=? WHERE id=?', [bool(done), done ? now() : null, id]);
    if (done) await Repo.addActivity({ customerId: r.customer_id, leadId: r.lead_id, type: r.channel, title: `Follow-up done: ${r.title}` });
  },
  async snoozeFollowUp(id: number, dueAt: number) { await db.runAsync('UPDATE followups SET due_at=?, done=0, done_at=NULL WHERE id=?', [dueAt, id]); },
  async deleteFollowUp(id: number) { await db.runAsync('DELETE FROM followups WHERE id = ?', [id]); },

  // ---------------- Notes & attachments ----------------
  async listNotes(customerId?: number): Promise<Note[]> {
    const rows = customerId != null
      ? await db.getAllAsync<any>('SELECT * FROM notes WHERE customer_id = ? ORDER BY pinned DESC, updated_at DESC', [customerId])
      : await db.getAllAsync<any>('SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC');
    return rows.map(toNote);
  },
  async saveNote(n: Partial<Note> & { body: string }): Promise<number> {
    const t = now();
    if (n.id) { await db.runAsync('UPDATE notes SET customer_id=?, title=?, body=?, pinned=?, updated_at=? WHERE id=?', [n.customerId ?? null, n.title || '', n.body, bool(n.pinned), t, n.id]); return n.id; }
    return (await db.runAsync('INSERT INTO notes (customer_id, title, body, pinned, created_at, updated_at) VALUES (?,?,?,?,?,?)', [n.customerId ?? null, n.title || '', n.body, bool(n.pinned), t, t])).lastInsertRowId;
  },
  async deleteNote(id: number): Promise<string[]> {
    const files = (await db.getAllAsync<any>('SELECT file FROM attachments WHERE note_id = ?', [id])).map((r) => r.file as string);
    await db.runAsync('DELETE FROM notes WHERE id = ?', [id]);
    return files;
  },
  async listAttachments(o: { customerId?: number; noteId?: number } = {}): Promise<Attachment[]> {
    const where: string[] = []; const p: any[] = [];
    if (o.customerId != null) { where.push('customer_id = ?'); p.push(o.customerId); }
    if (o.noteId != null) { where.push('note_id = ?'); p.push(o.noteId); }
    return (await db.getAllAsync<any>(`SELECT * FROM attachments ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`, p)).map(toAttachment);
  },
  async addAttachment(a: { customerId?: number | null; noteId?: number | null; name: string; file: string; mime?: string; size?: number }): Promise<number> {
    return (await db.runAsync('INSERT INTO attachments (customer_id, note_id, name, file, mime, size, created_at) VALUES (?,?,?,?,?,?,?)',
      [a.customerId ?? null, a.noteId ?? null, a.name, a.file, a.mime || '', a.size || 0, now()])).lastInsertRowId;
  },
  async deleteAttachment(id: number): Promise<string | null> {
    const r = await db.getFirstAsync<any>('SELECT file FROM attachments WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM attachments WHERE id = ?', [id]);
    return r?.file ?? null;
  },
  async allAttachmentFiles(): Promise<string[]> { return (await db.getAllAsync<any>('SELECT file FROM attachments')).map((r) => r.file as string); },

  // ---------------- Raw rows for analytics ----------------
  async analyticsRows() {
    const [customers, leads, activities, followups] = await Promise.all([
      db.getAllAsync<any>('SELECT id, status, group_id, created_at FROM customers'),
      db.getAllAsync<any>('SELECT id, stage, value, source, created_at, closed_at FROM leads'),
      db.getAllAsync<any>('SELECT id, type, at, amount FROM activities'),
      db.getAllAsync<any>('SELECT id, due_at, done, done_at, priority FROM followups'),
    ]);
    return {
      customers: customers.map((r) => ({ id: r.id, status: r.status as CustomerStatus, groupId: r.group_id ?? null, createdAt: r.created_at as number })),
      leads: leads.map((r) => ({ id: r.id, stage: r.stage as LeadStage, value: (r.value || 0) as number, source: r.source as string, createdAt: r.created_at as number, closedAt: (r.closed_at ?? null) as number | null })),
      activities: activities.map((r) => ({ id: r.id, type: r.type as ActivityType, at: r.at as number, amount: (r.amount || 0) as number })),
      followups: followups.map((r) => ({ id: r.id, dueAt: r.due_at as number, done: !!r.done, doneAt: (r.done_at ?? null) as number | null, priority: r.priority as Priority })),
    };
  },

  // ---------------- Danger zone ----------------
  /** Delete all rows. Pass inTransaction=true when the caller already opened a transaction (they cannot nest). */
  async eraseAll(inTransaction = false) {
    const wipe = async () => {
      for (const t of ['attachments', 'notes', 'followups', 'activities', 'leads', 'customer_tags', 'customers', 'tags', 'groups']) await db.runAsync(`DELETE FROM ${t}`);
    };
    if (inTransaction) await wipe(); else await db.withTransactionAsync(wipe);
  },
};

export { OPEN_STAGES, STAGE_PROBABILITY };
