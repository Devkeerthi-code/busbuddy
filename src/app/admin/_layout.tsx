import { Redirect, Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { TabBar } from '@/components/TabBar';
import { useAuth } from '@/lib/auth';

/** Desktop browsers get a side rail instead of phone-style bottom tabs. */
const RAIL_MIN_WIDTH = 1024;

export default function AdminLayout() {
  const { session, membership } = useAuth();
  const { width } = useWindowDimensions();
  if (!session || membership?.role !== 'transport_admin') return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarPosition: width >= RAIL_MIN_WIDTH ? 'left' : 'bottom' }}
      tabBar={(props) => <TabBar {...props} icons={{ index: 'bus', history: 'history', setup: 'route', me: 'user' }} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Live' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="setup" options={{ title: 'Setup' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
