// CSV export / import for customers. Pure TypeScript.
import type { Customer, CustomerStatus } from '../db/types';
import { CREDIT } from './brand';

const esc = (v: unknown) => {
  let s = v == null ? '' : String(v);
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell)
  if (/^[=+\-@]/.test(s) && !/^[+\-]?\d[\d\s.,-]*$/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CUSTOMER_COLUMNS = ['name', 'company', 'phone', 'email', 'city', 'address', 'status', 'group', 'tags', 'notes'] as const;

export function customersToCsv(customers: Customer[], groupName: (id: number | null) => string): string {
  const lines = [CUSTOMER_COLUMNS.join(',')];
  for (const c of customers) {
    lines.push([c.name, c.company, c.phone, c.email, c.city, c.address, c.status, groupName(c.groupId), (c.tags || []).map((t) => t.name).join('; '), c.notes].map(esc).join(','));
  }
  lines.push('', esc(`Exported from RetailX CRM - ${CREDIT}`));
  return lines.join('\r\n');
}

/** RFC-4180-style parser: quoted fields, escaped quotes, CRLF/LF, BOM. Returns rows of cells. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && src[i + 1] === '\n') i++; row.push(cell); cell = ''; rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

const ALIASES: Record<string, string> = {
  name: 'name', fullname: 'name', 'full name': 'name', customer: 'name', 'customer name': 'name', 'display name': 'name',
  company: 'company', business: 'company', organization: 'company', organisation: 'company',
  phone: 'phone', mobile: 'phone', 'phone number': 'phone', cell: 'phone', whatsapp: 'phone', 'mobile number': 'phone',
  email: 'email', 'e-mail': 'email', 'email address': 'email',
  city: 'city', town: 'city', address: 'address', status: 'status', group: 'group', tags: 'tags', tag: 'tags', notes: 'notes', note: 'notes',
};

export interface ImportRow { name: string; company: string; phone: string; email: string; city: string; address: string; status: CustomerStatus; group: string; tags: string[]; notes: string }
export interface ImportParse { rows: ImportRow[]; skipped: number; error?: 'empty' | 'noName' }

export function parseCustomerCsv(text: string): ImportParse {
  const table = parseCsv(text);
  if (table.length < 2) return { rows: [], skipped: 0, error: 'empty' };
  const header = table[0].map((h) => ALIASES[h.trim().toLowerCase()] || '');
  if (!header.includes('name')) return { rows: [], skipped: 0, error: 'noName' };
  const rows: ImportRow[] = []; let skipped = 0;
  for (const cells of table.slice(1)) {
    const g = (k: string) => { const i = header.indexOf(k); return i >= 0 ? (cells[i] || '').trim() : ''; };
    const name = g('name');
    if (!name || name.startsWith('Exported from RetailX CRM')) { skipped++; continue; }
    const st = g('status').toLowerCase();
    rows.push({
      name, company: g('company'), phone: g('phone'), email: g('email'), city: g('city'), address: g('address'),
      status: st === 'vip' || st === 'inactive' ? st : 'active', group: g('group'),
      tags: g('tags').split(/[;|]/).map((t) => t.trim()).filter(Boolean), notes: g('notes'),
    });
  }
  return { rows, skipped };
}
