// PDF reports via expo-print. Every PDF carries the company credit in its footer.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Activity, Customer, FollowUp, Settings } from '../db/types';
import { Fmt } from './format';
import { CREDIT } from './brand';

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]!));

export function customerHtml(c: Customer, acts: Activity[], followups: FollowUp[], s: Pick<Settings, 'businessName' | 'currency'>): string {
  const money = Fmt.money;
  const sales = acts.filter((a) => a.type === 'sale').reduce((t, a) => t + a.amount, 0);
  const paid = acts.filter((a) => a.type === 'payment').reduce((t, a) => t + a.amount, 0);
  const row = (k: string, v: string) => (v ? `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>` : '');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 28px 28px 56px; }
    body { font-family: -apple-system, Roboto, Helvetica, Arial, sans-serif; color: #171B2D; font-size: 12px; }
    h1 { margin: 0; font-size: 24px; letter-spacing: -.5px; } h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .8px; color: #4338CA; margin: 24px 0 8px; }
    .top { display: flex; justify-content: space-between; border-bottom: 3px solid #4338CA; padding-bottom: 12px; } .muted { color: #626987; }
    table { width: 100%; border-collapse: collapse; } td { padding: 6px 0; border-bottom: 1px solid #E4E7F2; vertical-align: top; } td.k { width: 28%; color: #626987; }
    .totals { display: flex; gap: 12px; margin-top: 14px; } .box { flex: 1; background: #E8E9FD; border-radius: 8px; padding: 10px 12px; } .box b { display: block; font-size: 16px; }
    footer { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 10px; color: #626987; border-top: 1px solid #E4E7F2; padding-top: 8px; }
  </style></head><body>
    <div class="top"><div><h1>${esc(c.name)}</h1><div class="muted">${esc(c.company)}</div></div><div style="text-align:right"><b>${esc(s.businessName)}</b><div class="muted">Customer profile · ${esc(Fmt.date(Date.now()))}</div></div></div>
    <h2>Contact</h2><table>${row('Phone', c.phone)}${row('Email', c.email)}${row('City', c.city)}${row('Address', c.address)}${row('Status', c.status)}${row('Tags', (c.tags || []).map((t) => t.name).join(', '))}${row('Notes', c.notes)}</table>
    <div class="totals"><div class="box"><b>${money(sales)}</b>Total sales</div><div class="box"><b>${money(paid)}</b>Payments received</div><div class="box"><b>${money(Math.max(0, sales - paid))}</b>Balance due</div></div>
    ${followups.length ? `<h2>Open follow-ups</h2><table>${followups.map((f) => `<tr><td class="k">${esc(Fmt.dateTime(f.dueAt))}</td><td>${esc(f.title)}</td></tr>`).join('')}</table>` : ''}
    <h2>Recent activity</h2><table>${acts.slice(0, 40).map((a) => `<tr><td class="k">${esc(Fmt.dateTime(a.at))}</td><td><b>${esc(a.title)}</b>${a.amount ? ` — ${money(a.amount)}` : ''}${a.body ? `<div class="muted">${esc(a.body)}</div>` : ''}</td></tr>`).join('') || '<tr><td class="muted">No activity logged.</td></tr>'}</table>
    <footer>${esc(CREDIT)}</footer>
  </body></html>`;
}

export async function printCustomerPdf(c: Customer, acts: Activity[], followups: FollowUp[], s: Pick<Settings, 'businessName' | 'currency'>) {
  const { uri } = await Print.printToFileAsync({ html: customerHtml(c, acts, followups, s) });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${c.name} profile` });
}
