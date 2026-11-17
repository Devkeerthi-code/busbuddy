import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field } from '@/components/ui/Field';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { Txt } from '@/components/ui/Txt';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import { space } from '@/theme/tokens';

const schema = z.object({
  college: z.string().trim().min(3, 'At least 3 characters.').max(80),
  campus: z.string().trim().min(2, 'At least 2 characters.').max(60),
  name: z.string().trim().min(1, 'Add your name.').max(60),
});

export default function SetupCollege() {
  const { session, membership, refreshMembership } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ college: '', campus: '', name: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | 'form', string>>>({});
  const [pending, setPending] = useState(false);

  if (!session) return <Redirect href="/sign-in" />;
  if (membership) return <Redirect href="/" />;

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  async function create() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const flat = z.flattenError(parsed.error).fieldErrors;
      return setErrors({ college: flat.college?.[0], campus: flat.campus?.[0], name: flat.name?.[0] });
    }
    setErrors({});
    setPending(true);
    try {
      const { error } = await supabase.rpc('create_college', {
        p_name: parsed.data.college,
        p_campus: parsed.data.campus,
        p_display_name: parsed.data.name,
      });
      if (error) throw error;
      toast('College created. Add your first route next.');
      await refreshMembership();
      router.replace('/admin/setup');
    } catch (e) {
      setErrors({ form: friendlyError(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen footer={<Button label="Create college" pending={pending} onPress={create} />}>
      <Txt variant="display">Set up your college</Txt>
      <Txt color="ink2">
        You become its transport admin. Next you add routes, buses and trips, then share two invite codes: one for
        students and staff, one for drivers.
      </Txt>
      <Card style={{ gap: space[4] }}>
        <Field label="College name" value={form.college} onChangeText={set('college')} error={errors.college} />
        <Field
          label="Campus name, as students say it"
          placeholder="e.g. Main Campus"
          value={form.campus}
          onChangeText={set('campus')}
          error={errors.campus}
        />
        <Field label="Your name" value={form.name} onChangeText={set('name')} error={errors.name} autoComplete="name" />
        {errors.form && <Txt variant="label" color="late">{errors.form}</Txt>}
      </Card>
      <Button label="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
