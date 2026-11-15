import assert from 'node:assert/strict';
import { createNodeDb } from './nodeDb';
import { initRepo, Repo } from '../src/db/repo';
import { exportAll, importAll, validateBackup, FileIO } from '../src/db/backupCore';

const files: FileIO = {
  async toDataUrl(f) { return `data:text/plain;base64,${Buffer.from('file:' + f).toString('base64')}`; },
  async fromDataUrl(_u, hint) { return 'restored_' + hint; },
};

(async () => {
  await initRepo(createNodeDb());

  // ---- settings
  const s = await Repo.getSettings();
  assert.equal(s.theme, 'system');
  await Repo.saveSettings({ ...s, businessName: 'Acme' });
  assert.equal((await Repo.getSettings()).businessName, 'Acme');

  // ---- groups / tags / customers
  const g = await Repo.saveGroup({ name: 'Wholesale', color: '#4338CA', icon: 'storefront' });
  const t1 = await Repo.upsertTag('Priority'), t2 = await Repo.upsertTag('priority'), t3 = await Repo.upsertTag('Eid');
  assert.equal(t1, t2, 'tags are unique case-insensitively');
  const ali = await Repo.saveCustomer({ name: ' Ali Raza ', phone: '0300 1234567', city: 'Karachi', groupId: g, status: 'vip' }, [t1, t3]);
  const sara = await Repo.saveCustomer({ name: 'Sara Khan', company: 'Khan & Co', email: 'sara@example.com' });
  assert.equal((await Repo.getCustomer(ali))!.name, 'Ali Raza');
  assert.deepEqual((await Repo.getCustomer(ali))!.tags!.map((t) => t.name).sort(), ['Eid', 'Priority']);
  assert.equal((await Repo.listCustomers({ q: 'khan' })).length, 1);
  assert.equal((await Repo.listCustomers({ q: '1234567' })).length, 1);
  assert.equal((await Repo.listCustomers({ q: '50%' })).length, 0, 'LIKE wildcards are escaped');
  assert.equal((await Repo.listCustomers({ status: 'vip' })).length, 1);
  assert.equal((await Repo.listCustomers({ groupId: g })).length, 1);
  assert.equal((await Repo.listCustomers({ tagId: t3 })).length, 1);
  assert.equal((await Repo.listGroups())[0].count, 1);
  assert.equal((await Repo.listTags()).find((t) => t.id === t1)!.count, 1);
  assert.ok((await Repo.existingPhones()).has('03001234567'));

  // ---- leads & pipeline
  const lead = await Repo.saveLead({ name: 'Bilal', phone: '0311', value: 50000, source: 'referral' });
  assert.equal((await Repo.getLead(lead))!.stage, 'new');
  await Repo.moveLead(lead, 'proposal');
  assert.equal((await Repo.listLeads('proposal')).length, 1);
  const cid = await Repo.convertLead(lead);
  const won = await Repo.getLead(lead);
  assert.equal(won!.stage, 'won'); assert.ok(won!.closedAt); assert.equal(won!.customerId, cid);
  assert.equal((await Repo.getCustomer(cid))!.name, 'Bilal');
  // converting a lead linked to an existing customer reuses it
  const l2 = await Repo.saveLead({ name: 'Sara deal', customerId: sara, value: 1000 });
  assert.equal(await Repo.convertLead(l2), sara);

  // ---- activities & follow-ups
  await Repo.addActivity({ customerId: ali, type: 'call', title: 'Intro call', at: 1000 });
  await Repo.addActivity({ customerId: ali, type: 'sale', title: 'Invoice 1', amount: 2500, at: 2000 });
  const acts = await Repo.listActivities({ customerId: ali });
  assert.deepEqual(acts.map((a) => a.title), ['Invoice 1', 'Intro call'], 'newest first');
  const fu = await Repo.saveFollowUp({ customerId: ali, title: 'Send quote', dueAt: Date.now() - 1000, channel: 'whatsapp', priority: 'high' });
  assert.equal((await Repo.listFollowUps({ done: false })).length, 1);
  await Repo.completeFollowUp(fu);
  assert.equal((await Repo.listFollowUps({ done: true }))[0].doneAt != null, true);
  assert.ok((await Repo.listActivities({ customerId: ali })).some((a) => a.title === 'Follow-up done: Send quote'), 'completion is logged on the timeline');
  await Repo.completeFollowUp(fu, false);
  assert.equal((await Repo.listFollowUps({ done: false })).length, 1, 'reopened');

  // ---- notes & attachments
  const n = await Repo.saveNote({ customerId: ali, title: 'Terms', body: 'Net 15', pinned: true });
  await Repo.addAttachment({ customerId: ali, noteId: n, name: 'quote.pdf', file: 'f1.pdf', mime: 'application/pdf', size: 10 });
  assert.equal((await Repo.listNotes(ali))[0].pinned, true);
  assert.equal((await Repo.listAttachments({ noteId: n })).length, 1);

  // ---- backup round trip: replace
  const backup = await exportAll(files);
  assert.equal(backup.app, 'RetailX CRM'); assert.ok(backup.by.includes('03286575000'));
  assert.equal(validateBackup(backup), null);
  assert.equal(validateBackup({ app: 'DarziHub', data: {} }), 'notRetailXBackup');
  assert.equal(validateBackup(null), 'invalidBackup');
  const json = JSON.parse(JSON.stringify(backup));
  await Repo.eraseAll();
  assert.equal((await Repo.listCustomers()).length, 0);
  const sum = await importAll(json, 'replace', files);
  assert.equal(sum.customers, 3); assert.equal(sum.attachments, 1);
  assert.equal((await Repo.getCustomer(ali))!.tags!.length, 2, 'tag links survive restore');
  assert.equal((await Repo.listAttachments({ customerId: ali }))[0].file, 'restored_quote.pdf');

  // ---- merge keeps existing, remaps ids, no duplicate tags
  const before = (await Repo.listCustomers()).length;
  await importAll(json, 'merge', files);
  assert.equal((await Repo.listCustomers()).length, before * 2);
  assert.equal((await Repo.listTags()).length, 2, 'tags reused on merge');
  const merged = (await Repo.listCustomers({ q: 'Ali' })).filter((c) => c.id !== ali)[0];
  assert.equal(merged.tags!.length, 2); assert.ok(merged.groupId !== null);
  assert.equal((await Repo.listActivities({ customerId: merged.id })).length >= 2, true);

  // ---- delete cascades
  await Repo.deleteCustomer(ali);
  assert.equal((await Repo.listActivities({ customerId: ali })).length, 0);
  assert.equal((await Repo.listNotes(ali)).length, 0);
  await Repo.deleteGroup(g);
  assert.equal((await Repo.listGroups()).length, 1, 'merged copy of the group remains');
  console.log('repo tests passed');
})().catch((e) => { console.error(e); process.exit(1); });
