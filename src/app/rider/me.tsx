import { router } from 'expo-router';
import { AccountSettings } from '@/components/AccountSettings';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';
import { useRiderPrefs } from '@/hooks/useRiderPrefs';

export default function RiderMe() {
  const { reset } = useRiderPrefs();
  return (
    <Screen inTabs>
      <Txt variant="display" accessibilityRole="header">Me</Txt>
      <AccountSettings />
      <Button
        label="Ask me my stop again"
        variant="ghost"
        onPress={async () => {
          await reset();
          router.replace('/rider');
        }}
      />
    </Screen>
  );
}
