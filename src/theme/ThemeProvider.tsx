import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { palettes, type Palette } from './tokens';

export type ThemeChoice = 'system' | 'light' | 'dark';

type ThemeValue = {
  colors: Palette;
  isDark: boolean;
  choice: ThemeChoice;
  setChoice: (choice: ThemeChoice) => void;
};

const STORAGE_KEY = 'busbuddy.theme';
const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [choice, setChoiceState] = useState<ThemeChoice>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') setChoiceState(saved);
      })
      .catch(() => undefined);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    // Light is the default: riders read this outdoors in sunlight on cheap LCD screens.
    const isDark = choice === 'dark' || (choice === 'system' && system === 'dark');
    return {
      colors: isDark ? palettes.dark : palettes.light,
      isDark,
      choice,
      setChoice: (next) => {
        setChoiceState(next);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
      },
    };
  }, [choice, system]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
