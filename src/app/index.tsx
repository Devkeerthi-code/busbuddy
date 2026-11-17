import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

/** Sends each person to their own home: riders to the answer, drivers to the button, admins to the fleet. */
export default function Entry() {
  const { session, membership, isPlatformAdmin } = useAuth();
  if (!session) return <Redirect href="/sign-in" />;
  if (!membership) return <Redirect href={isPlatformAdmin ? '/platform' : '/join'} />;
  if (membership.role === 'driver') return <Redirect href="/driver" />;
  if (membership.role === 'transport_admin') return <Redirect href="/admin" />;
  return <Redirect href="/rider" />;
}
