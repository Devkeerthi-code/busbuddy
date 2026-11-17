import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoBadge } from '@/components/ui/Pill';
import { Segmented } from '@/components/ui/Segmented';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { useTheme, type ThemeChoice } from '@/theme/ThemeProvider';
import { space } from '@/theme/tokens';

/** Account and app settings, shared by riders, drivers and admins. */
export function AccountSettings() {
  const { session, membership, signOut, refreshMembership } = useAuth();
  const { choice, setChoice } = useTheme();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);

  async function leave() {
    if (!session) return;
    setLeaving(true);
    try {
      const { error } = await supabase.from('memberships').delete().eq('user_id', session.user.id);
      if (error) throw error;
      await refreshMembership();
      router.replace('/join');
    } catch (e) {
      toast(friendlyError(e), 'error');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <>
      <Card style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
          <Txt variant="title" style={{ flex: 1 }}>{membership?.display_name}</Txt>
          {membership?.colleges.is_demo && <DemoBadge />}
        </View>
        <Txt color="ink2">{session?.user.email}</Txt>
        <Txt color="ink2">
          {membership?.colleges.name} · {membership?.role === 'transport_admin' ? 'Transport admin' : membership?.role === 'driver' ? 'Driver' : 'Student / staff'}
        </Txt>
      </Card>
      <View style={{ gap: space[2] }}>
        <Txt variant="label" color="ink2">Appearance</Txt>
        <Segmented<ThemeChoice>
          accessibilityLabel="Colour theme"
          value={choice}
          onChange={setChoice}
          options={[
            { value: 'system', label: 'Auto' },
            { value: 'light', label: 'Light', icon: 'sun' },
            { value: 'dark', label: 'Dark', icon: 'moon' },
          ]}
        />
        <Txt variant="label" color="ink2">Light is easiest to read outdoors in the sun.</Txt>
      </View>
      <Button label="Sign out" variant="secondary" onPress={signOut} />
      {membership?.role !== 'transport_admin' && (
        <Button label="Leave this college" variant="danger" pending={leaving} onPress={leave} />
      )}
      <Txt variant="label" color="ink2">
        BusBuddy only counts how many people use each feature. It never stores where students are. Drivers’ phones share
        location only during a trip they started.
      </Txt>
    </>
  );
}
