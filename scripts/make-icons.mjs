// Generates the RetailX CRM icons: a white "X" monogram with a cyan contact node on an indigo→violet gradient.
// Run: node scripts/make-icons.mjs  (needs `npm i --no-save sharp`). CI runs it before every build.
import fs from 'node:fs';
import sharp from 'sharp';

fs.mkdirSync('assets', { recursive: true });
const S = 1024;
const defs = '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4338CA"/><stop offset="1" stop-color="#7C3AED"/></linearGradient></defs>';
// Monogram: two rounded diagonal strokes forming an X, the upper-right arm ending in a cyan node.
const mark = (stroke = '#FFFFFF', node = '#22D3EE', k = 1, ring = '#4338CA') => {
  const a = 190 * k, c = 512;
  return `<g stroke-linecap="round" fill="none" stroke="${stroke}" stroke-width="${92 * k}">
    <line x1="${c - a}" y1="${c - a}" x2="${c + a}" y2="${c + a}"/>
    <line x1="${c - a}" y1="${c + a}" x2="${c + a}" y2="${c - a}"/></g>
    <circle cx="${c + a}" cy="${c - a}" r="${74 * k}" fill="${node}" stroke="${ring}" stroke-width="${18 * k}"/>`;
};
const svg = (body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${defs}${body}</svg>`);
const out = (name, body, size = S) => sharp(svg(body)).resize(size, size).png().toFile(`assets/${name}`);

const jobs = {
  'icon.png': `<rect width="${S}" height="${S}" fill="url(#g)"/>${mark()}`,
  'splash-icon.png': `<rect x="262" y="262" width="500" height="500" rx="140" fill="url(#g)"/>${mark('#FFFFFF', '#22D3EE', 0.52, '#5B3FD8')}`,
  'android-icon-foreground.png': mark('#FFFFFF', '#22D3EE', 0.78),
  'android-icon-background.png': `<rect width="${S}" height="${S}" fill="url(#g)"/>`,
  'android-icon-monochrome.png': mark('#000000', '#000000', 0.78, '#FFFFFF'),
};
for (const [n, b] of Object.entries(jobs)) await out(n, b);
await out('favicon.png', jobs['icon.png'], 48);
console.log('icons ready');
