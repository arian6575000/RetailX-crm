import assert from 'node:assert/strict';
import { buildPayload, generateKeyPair, signLicense, verifyLicense, formatAppDeviceId } from '../src/license/licenseCore';
import { DEVICE_PREFIX, PROJECT_CODE } from '../src/license/config';
import { FEATURE_DEFAULTS, featureOn } from '../src/license/permissions';
import spec from '../src/license/permissions.json';

const kp = generateKeyPair();
const other = generateKeyPair();
const DEV = 'AAAA-BBBB-CCCC-DDDD-EEEE';
const P = PROJECT_CODE;
const mk = (project = P, expiry: any = { days: 30 }, now?: Date) =>
  signLicense(buildPayload({ machineId: DEV, clientName: 'Test Client', planName: 'Pro', maxUsers: 1, features: {}, expiry, idFormat: 'hex20', project: { code: project, legacy: false }, now }), kp.privateKeyHex);
const v = (lic: string, o: any = {}) => verifyLicense(lic, { publicKeyHex: kp.publicKeyHex, machineId: DEV, projectCode: P, ...o });

assert.equal(P, 'retailx-crm'); assert.equal(DEVICE_PREFIX, 'RetailXCRM');
assert.equal(spec.project.code, P);

let r = v(mk()); assert.equal(r.ok, true);
r = v(mk(P, 'lifetime')); assert.equal(r.ok && r.daysLeft, null);
assert.deepEqual(verifyLicense(mk(), { publicKeyHex: other.publicKeyHex, machineId: DEV, projectCode: P }), { ok: false, reason: 'signature' });
assert.deepEqual(v(mk(), { machineId: '1111-2222-3333-4444-5555' }), { ok: false, reason: 'machine' });
assert.deepEqual(v(mk('darzihub')), { ok: false, reason: 'project' }, 'a DarziHub license never opens RetailX CRM');
assert.deepEqual(v(mk(), { now: Date.now() + 40 * 86400000 }), { ok: false, reason: 'expired' });
assert.deepEqual(v(mk(), { lastSeen: Date.now() + 3 * 86400000 }), { ok: false, reason: 'clock' });
const lic = mk(); const [h, sig] = lic.split('.');
assert.equal(v(h.slice(0, -4) + (h.endsWith('AAAA') ? 'BBBB' : 'AAAA') + '.' + sig).ok, false, 'tampered payload');
assert.deepEqual(v('hello'), { ok: false, reason: 'format' });

// app-specific device IDs: same phone, different app => different ID
const HEX = '87A9F285E2DF1234ABCD';
assert.equal(formatAppDeviceId(DEVICE_PREFIX, HEX), 'RetailXCRM-87A9-F285-E2DF');
assert.notEqual(formatAppDeviceId(DEVICE_PREFIX, HEX), formatAppDeviceId('RetailXPOS', HEX));
assert.throws(() => formatAppDeviceId('Retail X', HEX));
{
  const idA = formatAppDeviceId(DEVICE_PREFIX, HEX), idB = formatAppDeviceId('RetailXPOS', HEX);
  const licA = signLicense(buildPayload({ machineId: idA, clientName: 'C', planName: 'Pro', maxUsers: 1, features: {}, expiry: { days: 30 }, idFormat: 'any', project: { code: P, legacy: false } }), kp.privateKeyHex);
  assert.equal(verifyLicense(licA, { publicKeyHex: kp.publicKeyHex, machineId: idA, projectCode: P }).ok, true);
  assert.deepEqual(verifyLicense(licA, { publicKeyHex: kp.publicKeyHex, machineId: idB, projectCode: P }), { ok: false, reason: 'machine' });
  assert.equal(verifyLicense(licA, { publicKeyHex: kp.publicKeyHex, machineId: idA.toLowerCase(), projectCode: P }).ok, true);
}

// feature flags: license wins; unspecified keys use the schema default
assert.ok(Object.keys(FEATURE_DEFAULTS).length >= 5);
assert.equal(featureOn({ 'analytics.view': false }, 'analytics.view'), false);
assert.equal(featureOn({}, 'analytics.view'), FEATURE_DEFAULTS['analytics.view']);
console.log('license tests passed');
