import React, { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../ctx/AppContext';
import { useTheme } from '../ctx/ThemeContext';
import { useData } from '../lib/hooks';
import { Repo } from '../db/repo';
import { radius, space } from '../lib/theme';
import { Button, Card, EmptyState, Field, Header, IconTile, ListSkeleton, Pressy, Row, Screen, SectionHeader, T } from '../ui/kit';
import { Sheet } from '../ui/Sheet';

const SWATCHES = ['#4338CA', '#7C3AED', '#0891B2', '#047857', '#B45309', '#C73A37', '#DB2777', '#475569'];
type Edit = { kind: 'group' | 'tag'; id?: number; name: string; color: string };

export default function Groups() {
  const { c } = useTheme();
  const { bump, toast, confirm } = useApp();
  const [edit, setEdit] = useState<Edit | null>(null);
  const [err, setErr] = useState('');
  const { data, loading } = useData(async () => ({ groups: await Repo.listGroups(), tags: await Repo.listTags() }), []);

  const save = async () => {
    if (!edit) return;
    const name = edit.name.trim();
    if (!name) { setErr('Enter a name'); return; }
    if (edit.kind === 'group') await Repo.saveGroup({ id: edit.id, name, color: edit.color, icon: 'folder' });
    else if (edit.id) await Repo.updateTag(edit.id, name, edit.color); else await Repo.upsertTag(name, edit.color);
    bump(); setEdit(null); setErr(''); toast('Saved', 'success');
  };
  const remove = async () => {
    if (!edit?.id) return;
    const msg = edit.kind === 'group' ? 'Delete this group? Customers stay, they just lose the group.' : 'Delete this tag? Customers stay, they just lose the tag.';
    if (!(await confirm(msg, { danger: true, okLabel: 'Delete' }))) return;
    if (edit.kind === 'group') await Repo.deleteGroup(edit.id); else await Repo.deleteTag(edit.id);
    bump(); setEdit(null); toast('Deleted');
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header title="Groups & tags" subtitle="Segment customers your way" back />
      <Screen>
        {loading ? <ListSkeleton rows={4} /> : (<>
          <SectionHeader title="Groups" action="New group" onAction={() => setEdit({ kind: 'group', name: '', color: SWATCHES[0] })} />
          {data!.groups.length ? <Card pad={0}>{data!.groups.map((g, i) => (
            <Row key={g.id} leading={<IconTile icon="folder" color={g.color} />} title={g.name} subtitle={`${g.count ?? 0} customer${g.count === 1 ? '' : 's'}`} chevron last={i === data!.groups.length - 1} onPress={() => setEdit({ kind: 'group', id: g.id, name: g.name, color: g.color })} />
          ))}</Card> : <EmptyState icon="albums" title="No groups yet" message="Groups such as Wholesale or Retail keep your list organised." action="Create group" onAction={() => setEdit({ kind: 'group', name: '', color: SWATCHES[0] })} />}
          <View style={{ height: space.xl }} />
          <SectionHeader title="Tags" action="New tag" onAction={() => setEdit({ kind: 'tag', name: '', color: SWATCHES[1] })} />
          {data!.tags.length ? <Card pad={0}>{data!.tags.map((t, i) => (
            <Row key={t.id} leading={<IconTile icon="pricetag" color={t.color} />} title={t.name} subtitle={`${t.count ?? 0} customer${t.count === 1 ? '' : 's'}`} chevron last={i === data!.tags.length - 1} onPress={() => setEdit({ kind: 'tag', id: t.id, name: t.name, color: t.color })} />
          ))}</Card> : <EmptyState icon="pricetags" title="No tags yet" message="Tags like Credit, Priority or Eid order mark customers at a glance." action="Create tag" onAction={() => setEdit({ kind: 'tag', name: '', color: SWATCHES[1] })} />}
        </>)}
      </Screen>
      <Sheet visible={!!edit} onClose={() => { setEdit(null); setErr(''); }} title={`${edit?.id ? 'Edit' : 'New'} ${edit?.kind ?? ''}`} footer={
        <View style={{ flexDirection: 'row', gap: space.md }}>
          {edit?.id ? <Button variant="danger" icon="trash" label="Delete" onPress={remove} /> : null}
          <Button block icon="checkmark" label="Save" onPress={save} />
        </View>}>
        <Field label="Name" value={edit?.name ?? ''} onChangeText={(v) => { setEdit((e) => e && { ...e, name: v }); setErr(''); }} placeholder={edit?.kind === 'group' ? 'e.g. Wholesale' : 'e.g. Priority'} error={err || undefined} autoFocus />
        <T v="label" color={c.textMuted} style={{ marginBottom: 8 }}>Colour</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginBottom: space.md }}>
          {SWATCHES.map((s) => (
            <Pressy key={s} onPress={() => setEdit((e) => e && { ...e, color: s })} accessibilityRole="radio" accessibilityLabel={`Colour ${s}`} accessibilityState={{ selected: edit?.color === s }} style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: s, alignItems: 'center', justifyContent: 'center' }}>
              {edit?.color === s ? <Ionicons name="checkmark" size={22} color="#FFFFFF" /> : null}
            </Pressy>
          ))}
        </View>
      </Sheet>
    </View>
  );
}
