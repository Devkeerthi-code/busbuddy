import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { isValidInviteCode } from '@core/invite.ts';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CodeInput } from '@/components/ui/CodeInput';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

export default function Join() {
  const { session, membership, refreshMembership, signOut } = useAuth();
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!session) return <Redirect href="/sign-in" />;
  if (membership) return <Redirect href="/" />;

  async function join() {
    if (name.trim().length === 0) return setError('Add your name so your transport office knows who joined.');
    if (!isValidInviteCode(code)) return setError('Invite codes are 6 letters or numbers.');
    setError(null);
    setPending(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('join_college', { p_code: code, p_display_name: name.trim() });
      if (rpcError) throw rpcError;
      const joined = (data as { college_name: string }[] | null)?.[0];
      if (!joined) throw new Error('invalid_code');
      toast(`Joined ${joined.college_name}`);
      await refreshMembership();
      router.replace('/');
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen footer={<Button label="Join college" pending={pending} disabled={code.length < 6} onPress={join} />}>
      <Txt variant="display">Which college do you travel with?</Txt>
      <Txt color="ink2">Signed in as {session.user.email}</Txt>
      <Card style={{ gap: space[4] }}>
        <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <View style={{ gap: space[2] }}>
          <Txt variant="label" color="ink2">
            Invite code from your transport office
          </Txt>
          <CodeInput label="Invite code" value={code} onChange={(c) => { setCode(c); setError(null); }} error={!!error} />
          <Txt variant="label" color={error ? 'late' : 'ink2'} accessibilityLiveRegion="polite">
            {error ?? 'Students and drivers get different codes, so you land on the right screen.'}
          </Txt>
        </View>
      </Card>
      <View style={{ gap: space[2] }}>
        <Txt variant="label" color="ink2">
          Running the buses for your college?
        </Txt>
        <Button label="Set up your college" variant="secondary" icon="flag" onPress={() => router.push('/setup-college')} />
        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </View>
    </Screen>
  );
}
