import assert from 'node:assert/strict';
import { customersToCsv, parseCsv, parseCustomerCsv } from '../src/lib/csv';
import type { Customer } from '../src/db/types';

const c = (o: Partial<Customer>): Customer => ({ id: 1, name: 'X', company: '', phone: '', email: '', city: '', address: '', status: 'active', groupId: null, notes: '', createdAt: 0, updatedAt: 0, ...o });

// parser: quotes, commas, newlines, escaped quotes, BOM, CRLF
assert.deepEqual(parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\n"line1\nline2",z'), [['a', 'b'], ['x, y', 'he said "hi"'], ['line1\nline2', 'z']]);

// round trip through export → import
const out = customersToCsv(
  [c({ name: 'Ali, Raza', company: 'A "B" Co', phone: '0300', status: 'vip', groupId: 2, tags: [{ id: 1, name: 'Eid', color: '#fff' }, { id: 2, name: 'Priority', color: '#fff' }], notes: 'multi\nline' })],
  (id) => (id === 2 ? 'Wholesale' : ''),
);
assert.ok(out.includes('03286575000'), 'company credit is part of every export');
const back = parseCustomerCsv(out);
assert.equal(back.rows.length, 1);
assert.deepEqual(back.rows[0], { name: 'Ali, Raza', company: 'A "B" Co', phone: '0300', email: '', city: '', address: '', status: 'vip', group: 'Wholesale', tags: ['Eid', 'Priority'], notes: 'multi\nline' });

// formula injection is neutralised, but plain phone numbers like +92 300 are kept
const inj = customersToCsv([c({ name: '=HYPERLINK("x")', phone: '+92 300 1234567' })], () => '');
assert.ok(inj.includes(`'=HYPERLINK`)); assert.ok(inj.includes('+92 300 1234567') && !inj.includes("'+92"));

// header aliases from other tools (Google Contacts / Excel)
const g = parseCustomerCsv('Full Name,Mobile,E-mail\nSara,0311,s@x.com\n,0322,\nBilal,,');
assert.equal(g.rows.length, 2); assert.equal(g.skipped, 1); assert.equal(g.rows[0].phone, '0311'); assert.equal(g.rows[0].email, 's@x.com');
assert.equal(parseCustomerCsv('phone\n0300').error, 'noName');
assert.equal(parseCustomerCsv('name').error, 'empty');
console.log('csv tests passed');
