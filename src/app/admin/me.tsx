import { AccountSettings } from '@/components/AccountSettings';
import { Screen } from '@/components/ui/Screen';
import { Txt } from '@/components/ui/Txt';

export default function AdminMe() {
  return (
    <Screen inTabs>
      <Txt variant="display" accessibilityRole="header">Me</Txt>
      <AccountSettings />
    </Screen>
  );
}
