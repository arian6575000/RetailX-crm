// Attachment storage inside the app's private document folder + FileIO for backups.
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import type { FileIO } from '../db/backupCore';

const dir = () => {
  const d = new Directory(Paths.document, 'attachments');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};
export const fileUri = (name: string) => new File(dir(), name).uri;

const safeName = (n: string) => n.replace(/[^\w.\-]+/g, '_').slice(-60) || 'file';
const unique = (hint: string) => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}_${safeName(hint)}`;

export interface StoredFile { name: string; file: string; mime: string; size: number }

/** Copy a picked file into private storage. */
export function storeFile(uri: string, displayName: string, mime: string): StoredFile {
  const file = unique(displayName);
  const src = new File(uri);
  src.copy(new File(dir(), file));
  const size = new File(dir(), file).size ?? 0;
  return { name: displayName, file, mime, size };
}

export async function pickDocuments(): Promise<StoredFile[]> {
  const res = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true, type: '*/*' });
  if (res.canceled) return [];
  return res.assets.map((a) => {
    try { return storeFile(a.uri, a.name, a.mimeType || 'application/octet-stream'); }
    finally { try { const f = new File(a.uri); if (f.exists) f.delete(); } catch { /* cache copy */ } }
  });
}

export async function pickPhotos(source: 'gallery' | 'camera'): Promise<StoredFile[]> {
  if (source === 'camera') {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) throw new Error('Camera permission was not granted.');
  }
  const res = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 6, quality: 0.7 });
  if (res.canceled) return [];
  return res.assets.map((a, i) => storeFile(a.uri, a.fileName || `photo-${Date.now()}-${i}.jpg`, a.mimeType || 'image/jpeg'));
}

export function deleteFiles(names: (string | null | undefined)[]) {
  for (const n of names) { if (!n) continue; try { const f = new File(dir(), n); if (f.exists) f.delete(); } catch { /* best effort */ } }
}

export async function openFile(name: string, mime: string) {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device.');
  await Sharing.shareAsync(fileUri(name), { mimeType: mime || undefined, dialogTitle: name });
}

export const isImage = (mime: string) => mime.startsWith('image/');

export const fileIO: FileIO = {
  async toDataUrl(name) {
    try { const f = new File(dir(), name); if (!f.exists) return null; return `data:application/octet-stream;base64,${await f.base64()}`; } catch { return null; }
  },
  async fromDataUrl(dataUrl, hint) {
    const b64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const name = unique(hint);
    const f = new File(dir(), name);
    f.create();
    await f.write(b64, { encoding: 'base64' });
    return name;
  },
};

/** Delete stored files no attachment row references (run at startup and after "erase all"). */
export async function cleanOrphanFiles() {
  try {
    const { Repo } = await import('../db/repo');
    const keep = new Set(await Repo.allAttachmentFiles());
    for (const item of dir().list()) { if (item instanceof File && !keep.has(item.name)) { try { item.delete(); } catch { /* ignore */ } } }
  } catch { /* best effort */ }
}
