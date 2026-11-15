// ====== PER-APP LICENSE SETTINGS ======
// PROJECT_CODE: same code as in the License Generator "Projects" list.
// PUBLIC_KEY_HEX: the Ed25519 PUBLIC key (64 hex chars) of the "retailx-crm" project. Never put a private key here.
// Until a real key is pasted below, the app shows a "license not configured" screen (it never opens unlicensed).
export const PROJECT_CODE = "retailx-crm";
export const PUBLIC_KEY_HEX = "b107fda527767319c81166494534cd427a8e5a51c2d81457143c7d8d05e7e226";
// =======================================
// DEVICE_PREFIX: app name at the start of the Device ID ("RetailXCRM-87A9-F285-E2DF"); unique per app so licenses never cross apps.
export const DEVICE_PREFIX = "RetailXCRM";
// New app: there are no legacy 20-hex IDs to accept.
export const ACCEPT_LEGACY_DEVICE_ID = false;
export const KEY_CONFIGURED = /^[0-9a-fA-F]{64}$/.test(PUBLIC_KEY_HEX);
