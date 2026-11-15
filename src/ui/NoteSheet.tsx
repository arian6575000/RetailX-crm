import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../ctx/ThemeContext';
import { Note } from '../db/types';
import { space } from '../lib/theme';
import { Button, Field, Pressy, T } from './kit';
import { Sheet } from './Sheet';

export function NoteSheet({ note, onClose, onSave, onDelete }: { note: Partial<Note> | null; onClose: () => void; onSave: (n: Partial<Note> & { body: string }) => Promise<void>; onDelete: (n: Partial<Note>) => Promise<void> }) {
  const { c } = useTheme();
  const [draft, setDraft] = useState<Partial<Note>>({});
  const key = note ? `${note.id ?? 'new'}` : '';
  React.useEffect(() => { setDraft(note ?? {}); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet visible={!!note} onClose={onClose} title={note?.id ? 'Edit note' : 'New note'} tall footer={
      <View style={{ flexDirection: 'row', gap: space.md }}>
        {note?.id ? <Button variant="danger" label="Delete" icon="trash" onPress={async () => { await onDelete(note); onClose(); }} /> : null}
        <Button block label="Save note" icon="checkmark" disabled={!draft.body?.trim()} onPress={async () => { await onSave({ ...note, ...draft, body: draft.body!.trim() }); onClose(); }} />
      </View>}>
      <Field label="Title" value={draft.title ?? ''} onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))} placeholder="Optional" />
      <Field label="Note" value={draft.body ?? ''} onChangeText={(v) => setDraft((d) => ({ ...d, body: v }))} multiline placeholder="Write something worth remembering…" inputStyle={{ minHeight: 140 }} />
      <Pressy onPress={() => setDraft((d) => ({ ...d, pinned: !d.pinned }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }} accessibilityRole="checkbox" accessibilityState={{ checked: !!draft.pinned }}>
        <Ionicons name={draft.pinned ? 'pin' : 'pin-outline'} size={22} color={draft.pinned ? c.warning : c.textMuted} /><T v="body">Pin to top</T>
      </Pressy>
    </Sheet>
  );
}
