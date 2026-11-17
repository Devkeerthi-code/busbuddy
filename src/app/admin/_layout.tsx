import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';
import { useAuth } from '@/lib/auth';

export default function AdminLayout() {
  const { session, membership } = useAuth();
  if (!session || membership?.role !== 'transport_admin') return <Redirect href="/" />;
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} icons={{ index: 'bus', history: 'history', setup: 'route', me: 'user' }} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Live' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="setup" options={{ title: 'Setup' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
