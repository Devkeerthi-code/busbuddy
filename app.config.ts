import { existsSync } from 'node:fs';
import type { ConfigContext, ExpoConfig } from 'expo/config';

// google-services.json comes from Firebase (see README → Push notifications). It is not
// secret in the usual sense, but it is per-project, so each deployer adds their own.
const googleServicesFile = existsSync('./google-services.json') ? './google-services.json' : undefined;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'BusBuddy',
  slug: 'busbuddy',
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
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
});
