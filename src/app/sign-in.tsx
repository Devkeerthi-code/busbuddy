import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { z } from 'zod';
import { Wordmark } from '@/components/Wordmark';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { Segmented } from '@/components/ui/Segmented';
import { Txt } from '@/components/ui/Txt';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

type Mode = 'signin' | 'signup';

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

export default function SignIn() {
  const { session } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  if (session) return <Redirect href="/" />;

  async function submit() {
    const parsed = schema.safeParse({ email: email.trim().toLowerCase(), password });
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      setErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setErrors({});
    setPending(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword(parsed.data);
        if (error) throw error;
      } else {
        // On the web demo the confirmation link must come back to this site, not the project's default URL.
        const emailRedirectTo = Platform.OS === 'web' ? new URL('.', window.location.href).href : undefined;
        const { data, error } = await supabase.auth.signUp({ ...parsed.data, options: { emailRedirectTo } });
        if (error) throw error;
        if (!data.session) setCheckInbox(true);
      }
    } catch (error) {
      setErrors({ form: friendlyError(error) });
    } finally {
      setPending(false);
    }
  }

  if (checkInbox) {
    return (
      <Screen>
        <Wordmark />
        <Txt variant="display">Check your email</Txt>
        <Txt color="ink2">
          We sent a confirmation link to {email.trim()}. Open it on this phone, then come back and sign in.
        </Txt>
        <Button label="Back to sign in" variant="secondary" onPress={() => { setCheckInbox(false); setMode('signin'); }} />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          label={mode === 'signin' ? 'Sign in' : 'Create account'}
          pending={pending}
          onPress={submit}
        />
      }
    >
      <Wordmark />
      <View style={{ gap: space[2], marginTop: space[4] }}>
        <Txt variant="display">Where’s my bus?</Txt>
        <Txt color="ink2">
          Live position and arrival time of your college bus. Sign in once; after that the app opens straight on your bus.
        </Txt>
      </View>
      <Card style={{ gap: space[4] }}>
        <Segmented
          accessibilityLabel="Sign in or create an account"
          value={mode}
          onChange={(m) => { setMode(m); setErrors({}); }}
          options={[
            { value: 'signin', label: 'I have an account' },
            { value: 'signup', label: "I'm new" },
          ]}
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          error={errors.email}
        />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          hint={mode === 'signup' ? 'At least 8 characters.' : undefined}
          error={errors.password}
          onSubmitEditing={submit}
        />
        {errors.form && (
          <Txt variant="label" color="late" accessibilityLiveRegion="polite">
            {errors.form}
          </Txt>
        )}
      </Card>
      <Txt variant="label" color="ink2">
        Your transport office gives you an invite code after you sign in. Your location is never collected unless you
        are driving a trip.
      </Txt>
    </Screen>
  );
}
