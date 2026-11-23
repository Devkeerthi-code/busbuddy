import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// google-services.json comes from Firebase (see README → Push notifications). It is gitignored;
// EAS cloud builds get it from the GOOGLE_SERVICES_JSON file variable, local builds from the root.
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ?? (existsSync('./google-services.json') ? './google-services.json' : undefined);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BusBuddy',
  slug: 'busbuddy',
  owner: process.env.EAS_OWNER ?? 'devkeerthip',
  scheme: 'busbuddy',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#F3F1EC',
  android: {
    package: process.env.ANDROID_PACKAGE ?? 'io.github.devkeerthicode.busbuddy',
    adaptiveIcon: {
      backgroundColor: '#FFB400',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    googleServicesFile,
    predictiveBackGestureEnabled: false,
  },
  ios: { supportsTablet: false, bundleIdentifier: 'io.github.devkeerthicode.busbuddy' },
  web: { favicon: './assets/favicon.png', output: 'single', bundler: 'metro' },
  plugins: [
    'expo-router',
    'expo-font',
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 160, backgroundColor: '#FFB400' }],
    '@maplibre/maplibre-react-native',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'BusBuddy shares the bus location with students only while you are driving a trip.',
        locationAlwaysAndWhenInUsePermission:
          'BusBuddy keeps sharing the bus location during a trip even when the screen is off. It stops when the trip ends.',
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    ['expo-notifications', { color: '#FFB400', defaultChannel: 'arrivals' }],
  ],
  // GitHub Pages serves the web demo from /<repo>/; local dev and EAS builds use the root.
  experiments: { typedRoutes: true, baseUrl: process.env.WEB_BASE_URL || undefined },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '56c376cb-9424-427a-8361-2068edd5dbf3' },
  },
});
