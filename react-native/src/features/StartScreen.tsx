import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../design/Buttons';
import { colors, fonts, radius } from '../design/theme';

interface Props {
  isPreparing: boolean;
  error: string | null;
  onSign: () => void;
}

/** Screen 1: one button that creates a sample envelope and opens it for signing. */
export function StartScreen({ isPreparing, error, onSign }: Props) {
  const label = isPreparing ? 'Preparing document…' : error === null ? 'Sign document' : 'Try again';
  return (
    <View style={styles.screen}>
      <View style={styles.spacer} />
      <Text style={styles.title} accessibilityRole="header">
        Sign a sample document
      </Text>
      <Text style={styles.lead}>Creates a test envelope with SignatureAPI and opens it for signing inside the app.</Text>
      <DocumentCard />
      <View style={styles.spacer} />

      {error !== null ? (
        <Text style={styles.error} testID="start-error">
          {error}
        </Text>
      ) : null}
      <PrimaryButton title={label} onPress={onSign} disabled={isPreparing} busy={isPreparing} testID="sign-document" />
      <Text style={styles.footer}>Powered by SignatureAPI</Text>
    </View>
  );
}

function DocumentCard() {
  return (
    <View style={styles.card} accessible accessibilityLabel="Sample agreement, 1 page, test mode, not legally binding">
      <View style={styles.page}>
        {[0, 1, 2, 3].map(line => (
          <View key={line} style={styles.pageLine} />
        ))}
        <View style={styles.pageSignature} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>Sample agreement</Text>
        <Text style={styles.cardCaption}>1 page · test mode, not legally binding</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
  },
  spacer: { flex: 1 },
  title: { fontFamily: fonts.brand, fontSize: 32, lineHeight: 36, color: colors.text },
  lead: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.textSecondary },
  error: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.danger },
  footer: { fontFamily: fonts.regular, fontSize: 12, color: colors.textQuaternary, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  page: {
    width: 44,
    height: 56,
    padding: 8,
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.border,
  },
  pageLine: { height: 3, borderRadius: 2, backgroundColor: colors.hover },
  pageSignature: { width: 22, height: 3, borderRadius: 2, backgroundColor: colors.accentHalf },
  cardText: { flex: 1, gap: 2 },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  cardCaption: { fontFamily: fonts.regular, fontSize: 13, color: colors.textTertiary },
});
