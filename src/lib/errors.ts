/** Turns database/auth error codes into sentences a student or driver can act on. */
const MESSAGES: Record<string, string> = {
  invalid_code: "That code didn't match any college. Check it with your transport office.",
  too_many_attempts: 'Too many tries. Wait 10 minutes, then try again.',
  already_member: "You're already in a college. Leave it from the Me tab first.",
  not_signed_in: 'Please sign in again.',
  cannot_start_trip: "This trip can't be started now. It may already be running or be for another day.",
  not_your_active_trip: 'This trip is no longer yours or has ended.',
  forbidden: "You don't have permission to do that.",
  last_admin: 'Your college needs at least one transport admin. Promote someone else first.',
  driver_not_in_college: 'That person is not a driver in your college.',
  not_enough_path: 'This trip recorded too little of the road to use as a route shape.',
  'Invalid login credentials': 'Email or password is wrong.',
  'User already registered': 'An account with this email exists. Sign in instead.',
  'Email not confirmed': 'Confirm your email first. Check your inbox for the link.',
  'Failed to fetch': "Can't reach BusBuddy. Check your internet connection.",
  'Network request failed': "Can't reach BusBuddy. Check your internet connection.",
};

export function friendlyError(error: unknown): string {
  const raw =
    error && typeof error === 'object' && 'message' in error ? String((error as { message: unknown }).message) : String(error);
  for (const [key, message] of Object.entries(MESSAGES)) {
    if (raw.includes(key)) return message;
  }
  if (raw.includes('duplicate key')) return 'That already exists. Use a different name or number.';
  if (raw.includes('rate limit')) return 'Too many requests. Wait a minute, then try again.';
  return 'Something went wrong. Try again in a moment.';
}
