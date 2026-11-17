import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushResult = 'registered' | 'denied' | 'unsupported' | 'failed';

/**
 * Asks for notification permission and stores this phone's Expo push token.
 * Push needs a real device and a development/production build (not web).
 */
export async function registerForArrivalAlerts(userId: string): Promise<PushResult> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('arrivals', {
        name: 'Bus arriving',
        description: 'One alert when your bus is about 5 minutes from your stop',
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 120, 200],
        lightColor: '#FFB400',
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const status = current.granted ? 'granted' : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return 'denied';

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return 'unsupported';
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.from('push_tokens').upsert({ token, user_id: userId, updated_at: new Date().toISOString() });
    return error ? 'failed' : 'registered';
  } catch {
    return 'failed';
  }
}
