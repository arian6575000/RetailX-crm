// Screenshot screens in light + dark. PREVIEW_OUT = built dir, SHOTS = output dir, SCREENS = comma list.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const out = process.env.PREVIEW_OUT || 'tools/preview/dist', shots = process.env.SHOTS || 'tools/preview/shots';
const screens = (process.env.SCREENS || 'dashboard,customers,profile,followups').split(','), themes = (process.env.THEMES || 'light,dark').split(',');
fs.mkdirSync(shots, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.ttf': 'font/ttf' };
const srv = http.createServer((q, r) => { const f = path.join(out, q.url.split('?')[0].replace(/^\/$/, '/index.html')); if (!fs.existsSync(f)) { r.writeHead(404).end(); return; } r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); }).listen(0);
const port = srv.address().port;
const browser = await chromium.launch();
let bad = 0;
for (const s of screens) for (const t of themes) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: t === 'dark' ? 'dark' : 'light' });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await page.goto(`http://localhost:${port}/#screen=${s}&theme=${t}${process.env.EXTRA || ''}`); await page.reload();
  await page.waitForFunction('window.__READY__', null, { timeout: 15000 }).catch(() => errs.push('never became ready'));
  await page.screenshot({ path: `${shots}/${s}-${t}.png` });
  if (errs.length) { bad++; console.log(`✗ ${s}/${t}`, [...new Set(errs)].slice(0, 4)); } else console.log(`✓ ${s}/${t}`);
  await ctx.close();
}
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
