import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
const out = process.env.PREVIEW_OUT || 'tools/preview/dist';
fs.mkdirSync(out, { recursive: true });
const STUBS = ['expo-haptics', 'expo-file-system', 'expo-document-picker', 'expo-image-picker', 'expo-sharing', 'expo-print', 'expo-notifications', 'expo-contacts', 'expo-font', 'expo-secure-store', 'expo-local-authentication', 'expo-screen-capture', 'expo-clipboard', '@react-native-community/datetimepicker', 'expo-splash-screen', 'expo-status-bar', 'expo-constants', 'expo-application', 'expo-device', 'expo-crypto', 'expo-linking', 'expo-asset', '@react-native/assets-registry/registry'];
const NAMES = [...new Set(['isLoaded','loadAsync','isLoading','processFontFamily','unloadAsync'].concat(fs.readdirSync('src', { recursive: true }).filter((f) => /\.tsx?$/.test(f)).flatMap((f) => [...fs.readFileSync('src/' + f, 'utf8').matchAll(/\b[A-Z][A-Za-z]*\.([A-Za-z_]\w*)/g)].map((m) => m[1]))))];
const stubPlugin = {
  name: 'stubs',
  setup(b) {
    b.onResolve({ filter: new RegExp(`^(${STUBS.map((s) => s.replace(/[/.-]/g, '\\$&')).join('|')})$`) }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onResolve({ filter: /fabric\/Native[A-Za-z]*Module(\.js)?$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ loader: 'js', contents: `
      const NAMES = ${JSON.stringify(NAMES)};
      const make = () => new Proxy(function () {}, {
        get: (t, k) => (k === '__esModule' ? true : k === 'then' ? undefined : k === 'default' ? make() : make()),
        apply: () => Promise.resolve(make()), construct: () => ({}),
        ownKeys: () => [...new Set(['length', 'name', 'prototype', ...NAMES])], has: () => true,
        getOwnPropertyDescriptor: (t, k) => (NAMES.includes(k) ? { value: make(), enumerable: true, configurable: true, writable: true } : Reflect.getOwnPropertyDescriptor(t, k)),
      });
      module.exports = make();` }));
  },
};
await build({
  entryPoints: ['tools/preview/entry.tsx'], bundle: true, outfile: `${out}/bundle.js`, platform: 'browser', format: 'iife', jsx: 'automatic', sourcemap: false, logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true', global: 'window' },
  alias: { 'react-native': 'react-native-web', 'expo-router': path.resolve('tools/preview/stub-expo-router.tsx') },
  resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.jsx', '.mjs', '.json'],
  loader: { '.png': 'dataurl', '.ttf': 'dataurl', '.js': 'jsx' }, plugins: [stubPlugin], mainFields: ['browser', 'module', 'main'],
});
const nm = 'node_modules';
fs.copyFileSync(`${nm}/sql.js/dist/sql-wasm.js`, `${out}/sql-wasm.js`); fs.copyFileSync(`${nm}/sql.js/dist/sql-wasm.wasm`, `${out}/sql-wasm.wasm`);
fs.mkdirSync(`${out}/fonts`, { recursive: true });
const inter = { Inter_400Regular: '400Regular', Inter_500Medium: '500Medium', Inter_600SemiBold: '600SemiBold', Inter_700Bold: '700Bold' };
let css = `@font-face{font-family:ionicons;src:url(fonts/Ionicons.ttf)}`;
fs.copyFileSync(`${nm}/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf`, `${out}/fonts/Ionicons.ttf`);
for (const [fam, dir] of Object.entries(inter)) { fs.copyFileSync(`${nm}/@expo-google-fonts/inter/${dir}/${fam}.ttf`, `${out}/fonts/${fam}.ttf`); css += `@font-face{font-family:${fam};src:url(fonts/${fam}.ttf)}`; }
fs.writeFileSync(`${out}/index.html`, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=390"><style>${css} html,body,#root{margin:0;height:100%;} body{overflow:hidden}</style></head><body><div id="root" style="display:flex"></div><script src="sql-wasm.js"></script><script src="bundle.js"></script></body></html>`);
console.log('preview built ->', out);
