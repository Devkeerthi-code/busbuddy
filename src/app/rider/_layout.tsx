import { Redirect, Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { TabBar } from '@/components/TabBar';
import { RiderPrefsProvider } from '@/hooks/useRiderPrefs';
import { useAuth } from '@/lib/auth';

/** Desktop browsers get a side rail instead of phone-style bottom tabs. */
const RAIL_MIN_WIDTH = 1024;

export default function RiderLayout() {
  const { session, membership } = useAuth();
  const { width } = useWindowDimensions();
  if (!session || !membership) return <Redirect href="/" />;
  return (
    <RiderPrefsProvider>
      <Tabs
        screenOptions={{ headerShown: false, tabBarPosition: width >= RAIL_MIN_WIDTH ? 'left' : 'bottom' }}
        tabBar={(props) => <TabBar {...props} icons={{ index: 'home', map: 'map', me: 'user' }} />}
      >
        <Tabs.Screen name="index" options={{ title: 'My bus' }} />
        <Tabs.Screen name="map" options={{ title: 'Map' }} />
        <Tabs.Screen name="me" options={{ title: 'Me' }} />
      </Tabs>
    </RiderPrefsProvider>
  );
}
