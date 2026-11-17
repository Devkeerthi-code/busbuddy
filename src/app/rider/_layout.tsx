import { Redirect, Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';
import { RiderPrefsProvider } from '@/hooks/useRiderPrefs';
import { useAuth } from '@/lib/auth';

export default function RiderLayout() {
  const { session, membership } = useAuth();
  if (!session || !membership) return <Redirect href="/" />;
  return (
    <RiderPrefsProvider>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBar {...props} icons={{ index: 'home', map: 'map', me: 'user' }} />}
      >
        <Tabs.Screen name="index" options={{ title: 'My bus' }} />
        <Tabs.Screen name="map" options={{ title: 'Map' }} />
        <Tabs.Screen name="me" options={{ title: 'Me' }} />
      </Tabs>
    </RiderPrefsProvider>
  );
}
