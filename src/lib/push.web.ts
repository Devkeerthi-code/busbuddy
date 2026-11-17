import type { PushResult } from './push';

/** Push alerts need the Android app; browsers get a clear "unsupported" instead of a silent no-op. */
export async function registerForArrivalAlerts(_userId: string): Promise<PushResult> {
  return 'unsupported';
}
