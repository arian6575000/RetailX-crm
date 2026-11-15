// Realistic demo data for the preview (runs through the real Repo).
import { Repo } from '../../src/db/repo';
const H = 3600000, D = 86400000;
export async function seed() {
  const now = Date.now();
  const gW = await Repo.saveGroup({ name: 'Wholesale', color: '#4338CA', icon: 'storefront' });
  const gR = await Repo.saveGroup({ name: 'Retail', color: '#0891B2', icon: 'people' });
  const tVip = await Repo.upsertTag('Priority'), tEid = await Repo.upsertTag('Eid order'), tCr = await Repo.upsertTag('Credit');
  const people: [string, string, string, string, string, any, number | null, number[]][] = [
    ['Ayesha Khan', 'Khan Textiles', '0300 1234567', 'Karachi', 'ayesha@khantextiles.pk', 'vip', gW, [tVip, tEid]],
    ['Bilal Ahmed', 'Ahmed Mobile Hub', '0311 7654321', 'Lahore', 'bilal@ahmedhub.pk', 'active', gR, [tCr]],
    ['Chaudhry Imran', 'Imran General Store', '0333 9988776', 'Faisalabad', '', 'active', gW, []],
    ['Dr. Farah Siddiqui', '', '0345 2223344', 'Karachi', 'farah@clinic.pk', 'vip', null, [tVip]],
    ['Ehsan Traders', 'Ehsan & Sons', '0321 5556677', 'Multan', '', 'inactive', gW, []],
    ['Fatima Noor', 'Noor Boutique', '0301 4445566', 'Islamabad', 'fatima@noor.pk', 'active', gR, [tEid]],
  ];
  const ids: number[] = [];
  for (const [name, company, phone, city, email, status, groupId, tags] of people) ids.push(await Repo.saveCustomer({ name, company, phone, city, email, status, groupId }, tags));
  const acts: [number, any, string, string, number, number][] = [
    [0, 'sale', 'Invoice #1042', 'Spring collection, 40 pieces', 184000, 2 * D], [0, 'payment', 'Advance received', '', 90000, 2 * D - H], [0, 'call', 'Discussed Eid stock', 'Wants delivery before 20th', 0, 5 * H],
    [1, 'visit', 'Shop visit', '', 0, D], [1, 'whatsapp', 'Sent price list', '', 0, 3 * D], [2, 'meeting', 'Quarterly review', '', 0, 9 * D],
  ];
  for (const [i, type, title, body, amount, ago] of acts) await Repo.addActivity({ customerId: ids[i], type, title, body, amount, at: now - ago });
  const leads: [string, number, any, string][] = [['Zubair Electronics', 450000, 'negotiation', 'referral'], ['Hina Fabrics', 180000, 'proposal', 'walk-in'], ['City Mart', 90000, 'qualified', 'whatsapp'], ['Rashid Bros', 60000, 'new', 'call'], ['Noman Garments', 320000, 'contacted', 'social'], ['Sana Retail', 210000, 'won', 'referral'], ['Old lead', 40000, 'lost', 'walk-in']];
  for (const [name, value, stage, source] of leads) await Repo.saveLead({ name, value, stage, source });
  const fu: [number | null, string, any, any, number][] = [
    [ids[1], 'Send revised quotation', 'whatsapp', 'high', -2 * D + 3 * H], [ids[0], 'Confirm Eid delivery date', 'call', 'high', 2 * H], [ids[3], 'Follow up on clinic order', 'email', 'medium', 5 * H],
    [ids[5], 'Show new arrivals', 'visit', 'low', 1 * D + 2 * H], [ids[2], 'Collect pending payment', 'call', 'medium', 3 * D], [null, 'Renew shop licence', 'meeting', 'low', 6 * D],
  ];
  for (const [customerId, title, channel, priority, off] of fu) await Repo.saveFollowUp({ customerId, title, channel, priority, dueAt: now + off });
  const done = await Repo.saveFollowUp({ customerId: ids[4], title: 'Re-activation call', channel: 'call', priority: 'low', dueAt: now - D }); await Repo.completeFollowUp(done);
  await Repo.saveNote({ customerId: ids[0], title: 'Payment terms', body: '50% advance, balance within 15 days of delivery. Prefers WhatsApp over calls after 5 pm.', pinned: true });
  return ids;
}
