import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PlainButton, PrimaryButton } from '../design/Buttons';
import { colors, fonts } from '../design/theme';
import type { Ending } from './signingFlow';

interface Props {
  /** null while the server confirms. */
  ending: Ending | null;
  onDone: () => void;
  onStartAgain: () => void;
}

/** Screen 3: how the signing ended. */
export function ResultScreen({ ending, onDone, onStartAgain }: Props) {
  const look = ending ? lookFor(ending) : null;
  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      {look ? (
        <View
          style={[styles.badge, { backgroundColor: look.background }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text style={[styles.symbol, { color: look.foreground }]}>{look.symbol}</Text>
        </View>
      ) : (
        <View style={styles.badge}>
          <ActivityIndicator size="large" color={colors.textTertiary} />
        </View>
      )}
      <Text style={styles.title} testID="result-title" accessibilityRole="header">
        {look?.title ?? 'Confirming signature…'}
      </Text>
      <Text style={styles.message}>{look?.message ?? 'Checking with SignatureAPI.'}</Text>
      <View style={styles.spacer} />
      <View style={styles.actions}>
        <Actions ending={ending} onDone={onDone} onStartAgain={onStartAgain} />
      </View>
    </View>
  );
}

function Actions({ ending, onDone, onStartAgain }: Props) {
  switch (ending?.kind) {
    case 'signed':
      return <PrimaryButton title="Done" onPress={onDone} />;
    case 'canceled':
      return (
        <>
          <PrimaryButton title="Try again" onPress={onStartAgain} />
          <PlainButton title="Back to start" onPress={onDone} />
        </>
      );
    case 'couldNotOpen':
      return <PrimaryButton title="Start again" onPress={onStartAgain} />;
    case 'notConfirmed':
      return <PrimaryButton title="Back to start" onPress={onDone} />;
    case undefined:
      return null;
  }
}

interface Look {
  title: string;
  message: string;
  symbol: string;
  foreground: string;
  background: string;
}

function lookFor(ending: Ending): Look {
  switch (ending.kind) {
    case 'signed':
      return {
        title: 'Document signed',
        message: 'SignatureAPI confirmed the signature. The signed PDF is ready.',
        symbol: '✓',
        foreground: colors.success,
        background: colors.successSoft,
      };
    case 'canceled':
      return {
        title: 'Signing canceled',
        message: 'Nothing was signed. You can start again whenever you like.',
        symbol: '✕',
        foreground: colors.textSecondary,
        background: colors.hover,
      };
    case 'couldNotOpen':
      return {
        title: 'Couldn’t open the document',
        message: ending.reason,
        symbol: '!',
        foreground: colors.danger,
        background: colors.dangerSoft,
      };
    case 'notConfirmed':
      return {
        title: 'Signature not confirmed yet',
        message: ending.reason,
        symbol: '!',
        foreground: colors.warning,
        background: colors.warningSoft,
      };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 14,
  },
  spacer: { flex: 1 },
  badge: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontFamily: fonts.semibold, fontSize: 30 },
  title: { fontFamily: fonts.brand, fontSize: 28, lineHeight: 32, color: colors.text, textAlign: 'center' },
  message: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.textSecondary, textAlign: 'center', maxWidth: 320 },
  actions: { alignSelf: 'stretch', gap: 8 },
});
