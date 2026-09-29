import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius } from './theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  testID?: string;
}

/** The solid, full-width call to action. */
export function PrimaryButton({ title, onPress, disabled = false, busy = false, testID }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed, disabled && styles.primaryDisabled]}
    >
      <View style={styles.row}>
        {busy ? <ActivityIndicator color="#FFFFFF" /> : null}
        <Text style={styles.primaryLabel}>{title}</Text>
      </View>
    </Pressable>
  );
}

/** A secondary action set as accent-colored text. */
export function PlainButton({ title, onPress, testID }: ButtonProps) {
  return (
    <Pressable onPress={onPress} testID={testID} accessibilityRole="button" style={styles.plain}>
      {({ pressed }) => <Text style={[styles.plainLabel, pressed && styles.plainPressed]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    minHeight: 50,
    borderRadius: radius,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryPressed: { opacity: 0.8 },
  primaryDisabled: { opacity: 0.85 },
  primaryLabel: { color: '#FFFFFF', fontFamily: fonts.semibold, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  plain: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  plainLabel: { color: colors.accent, fontFamily: fonts.medium, fontSize: 16 },
  plainPressed: { opacity: 0.6 },
});
