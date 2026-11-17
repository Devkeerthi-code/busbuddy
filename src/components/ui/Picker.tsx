import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { fonts, radius, space, tap } from '@/theme/tokens';
import { Icon } from './Icon';
import { Txt } from './Txt';

export type PickerOption = { value: string; label: string; detail?: string };

type Props = {
  label: string;
  placeholder: string;
  options: PickerOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** A select that opens a big, thumb-friendly list. Native selects are tiny on cheap phones. */
export function Picker({ label, placeholder, options, value, onChange, disabled }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={{ gap: space[2] }}>
      <Txt variant="label" color="ink2">
        {label}
      </Txt>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityHint="Opens a list to choose from"
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.line, opacity: disabled ? 0.5 : 1 }]}
      >
        <Txt style={{ fontFamily: fonts.semibold, fontSize: 17, flex: 1 }} color={selected ? 'ink' : 'ink2'} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Txt>
        <Icon name="chevronDown" size={20} color={colors.ink2} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.scrim, { backgroundColor: colors.scrim }]} onPress={() => setOpen(false)} accessibilityLabel="Close list" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space[4] }]}>
          <Txt variant="title" style={{ paddingHorizontal: space[4], paddingBottom: space[2] }}>
            {label}
          </Txt>
          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                  style={[styles.row, active && { backgroundColor: colors.surface2 }]}
                >
                  <View style={{ flex: 1 }}>
                    <Txt style={{ fontFamily: fonts.semibold, fontSize: 17 }}>{item.label}</Txt>
                    {item.detail && <Txt variant="label" color="ink2">{item.detail}</Txt>}
                  </View>
                  {active && <Icon name="check" color={colors.accentText} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: tap.min + 4,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  scrim: { flex: 1 },
  sheet: { maxHeight: '70%', borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingTop: space[4] },
  row: { minHeight: tap.min + 8, paddingHorizontal: space[4], flexDirection: 'row', alignItems: 'center', gap: space[3] },
});
