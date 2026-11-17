import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { SetupHeader } from '@/components/admin/SetupHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Picker } from '@/components/ui/Picker';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useAsync } from '@/hooks/useAsync';
import { fetchInviteCodes, fetchMembers, type InviteCode, type Member } from '@/lib/admin-data';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Role } from '@/lib/types';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space } from '@/theme/tokens';

const ROLE_LABEL: Record<Role, string> = { rider: 'Student / staff', driver: 'Driver', transport_admin: 'Transport admin' };

export default function People() {
  const { membership, session } = useAuth();
  const { colors } = useTheme();
  const toast = useToast();
  const [rotating, setRotating] = useState<string | null>(null);
  const collegeId = membership?.college_id ?? '';
  const loadPeople = useCallback(
    async (): Promise<{ members: Member[]; codes: InviteCode[] }> => {
      const [members, codes] = await Promise.all([fetchMembers(collegeId), fetchInviteCodes()]);
      return { members, codes };
    },
    [collegeId],
  );
  const { data, error, reload: load } = useAsync(loadPeople);
  const members = data?.members ?? [];
  const codes = data?.codes ?? [];

  async function rotate(role: 'rider' | 'driver') {
    setRotating(role);
    const { error } = await supabase.rpc('rotate_invite_code', { p_role: role });
    setRotating(null);
    if (error) return toast(friendlyError(error), 'error');
    toast('New code made. The old one no longer works.');
    await load();
  }

  async function setRole(member: Member, role: Role) {
    const { error } = await supabase.from('memberships').update({ role }).eq('user_id', member.user_id);
    if (error) return toast(friendlyError(error), 'error');
    toast(`${member.display_name} is now ${ROLE_LABEL[role].toLowerCase()}`);
    await load();
  }

  async function remove(member: Member) {
    const { error } = await supabase.from('memberships').delete().eq('user_id', member.user_id);
    if (error) return toast(friendlyError(error), 'error');
    toast(`${member.display_name} removed`);
    await load();
  }

  const college = membership?.colleges.name ?? 'our college';

  return (
    <Screen>
      <SetupHeader title="People" />
      {error && <Txt color="late">{error}</Txt>}
      {(['rider', 'driver'] as const).map((role) => {
        const code = codes.find((c) => c.role === role)?.code ?? '······';
        return (
          <Card key={role} style={{ gap: space[3] }}>
            <Txt variant="micro" color="ink2">{role === 'rider' ? 'Code for students and staff' : 'Code for drivers only'}</Txt>
            <View style={[styles.code, { backgroundColor: colors.board }]}>
              <Txt style={[styles.codeText, { color: colors.boardInk }]} accessibilityLabel={code.split('').join(' ')}>{code}</Txt>
            </View>
            <View style={styles.actions}>
              <Button
                style={{ flex: 1 }}
                label="Share"
                icon="share"
                onPress={() =>
                  Share.share({
                    message: `Track the ${college} bus live on BusBuddy. Sign in and enter code ${code}.`,
                  })
                }
              />
              <Button style={{ flex: 1 }} label="New code" variant="secondary" icon="refresh" pending={rotating === role} onPress={() => rotate(role)} />
            </View>
          </Card>
        );
      })}
      <Txt variant="micro" color="ink2">Members · {members.length}</Txt>
      {members.map((m) => (
        <Card key={m.user_id} style={{ gap: space[2] }}>
          <Txt variant="label" style={{ fontSize: 17 }}>{m.display_name}{m.user_id === session?.user.id ? ' (you)' : ''}</Txt>
          <Picker
            label="Role"
            placeholder="Role"
            value={m.role}
            options={(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
            onChange={(r) => setRole(m, r as Role)}
          />
          {m.user_id !== session?.user.id && <Button label="Remove from college" variant="ghost" onPress={() => remove(m)} />}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { borderRadius: radius.md, paddingVertical: space[4], alignItems: 'center' },
  codeText: { fontFamily: fonts.black, fontSize: 40, letterSpacing: 8 },
  actions: { flexDirection: 'row', gap: space[3] },
});
