import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { useData, useDebounced } from '../lib/hooks';
import { Repo } from '../db/repo';
import { Note } from '../db/types';
import { deleteFiles } from '../lib/files';
import { Fmt } from '../lib/format';
import { space } from '../lib/theme';
import { Card, EmptyState, Fab, Header, ListSkeleton, Screen, SearchBar, T } from '../ui/kit';
import { NoteSheet } from '../ui/NoteSheet';

export default function Notes() {
  const { c } = useTheme();
  const { bump, toast } = useApp();
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const [edit, setEdit] = useState<Partial<Note> | null>(null);
  const { data, loading } = useData(async () => ({ notes: await Repo.listNotes(), customers: await Repo.customerMap() }), []);
  const list = useMemo(() => (data?.notes ?? []).filter((n) => !dq.trim() || `${n.title} ${n.body}`.toLowerCase().includes(dq.trim().toLowerCase())), [data, dq]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Notes" subtitle={data ? `${data.notes.length} saved` : ' '} back />
      <Screen contentStyle={{ paddingBottom: 120 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search notes" />
        <View style={{ gap: space.md, marginTop: space.md }}>
          {loading ? <ListSkeleton rows={4} /> : list.length ? list.map((n) => {
            const who = n.customerId ? data!.customers[n.customerId] : undefined;
            return (
              <Card key={n.id} onPress={() => setEdit(n)} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {n.pinned ? <Ionicons name="pin" size={14} color={c.warning} /> : null}
                  <T v="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>{n.title || 'Untitled note'}</T>
                  <T v="caption" color={c.textFaint}>{Fmt.date(n.updatedAt, true)}</T>
                </View>
                <T v="body" color={c.textMuted} numberOfLines={3}>{n.body}</T>
                {who ? <T v="caption" color={c.primary}>{who.name}</T> : null}
              </Card>
            );
          }) : <EmptyState icon="document-text" title={dq ? 'No matching notes' : 'No notes yet'} message={dq ? 'Try different words.' : 'Capture anything worth remembering. Notes for a customer also appear on their profile.'} action={dq ? undefined : 'New note'} onAction={() => setEdit({ title: '', body: '' })} />}
        </View>
      </Screen>
      <Fab label="New note" icon="add" onPress={() => setEdit({ title: '', body: '' })} />
      <NoteSheet note={edit} onClose={() => setEdit(null)} onSave={async (n) => { await Repo.saveNote(n as any); bump(); toast('Note saved', 'success'); }} onDelete={async (n) => { deleteFiles(await Repo.deleteNote(n.id!)); bump(); }} />
    </View>
  );
}
