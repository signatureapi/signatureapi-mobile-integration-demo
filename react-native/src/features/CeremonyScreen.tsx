import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { CeremonyWebView } from '../ceremony/CeremonyWebView';
import type { CeremonyEvent } from '../ceremony/ceremonyEvent';
import { colors, fonts } from '../design/theme';
import type { Ceremony } from './signingFlow';

interface Props {
  ceremony: Ceremony | null;
  onEvent: (event: CeremonyEvent) => void;
  onClose: () => void;
}

/**
 * Screen 2: the ceremony, full screen, under a thin native bar the app owns.
 *
 * A full-screen modal slides it over the start screen, as on iOS. Its
 * `onRequestClose` is Android's back gesture, which counts as canceled, like
 * the Close button.
 */
export function CeremonyScreen({ ceremony, onEvent, onClose }: Props) {
  // Keep showing the last ceremony while the modal slides away.
  const [shown, setShown] = useState(ceremony);
  if (ceremony && ceremony !== shown) setShown(ceremony);

  return (
    <Modal
      visible={ceremony !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      {/* A modal is a separate window on Android: it needs its own inset provider. */}
      <SafeAreaProvider>
        <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
          <View style={styles.bar}>
            <Pressable onPress={onClose} testID="close-ceremony" accessibilityRole="button" hitSlop={8} style={styles.close}>
              {({ pressed }) => <Text style={[styles.closeLabel, pressed && styles.pressed]}>Close</Text>}
            </Pressable>
            <Text style={styles.title} accessibilityRole="header">
              Sign document
            </Text>
          </View>
          {shown ? (
            <CeremonyWebView key={shown.url} ceremonyUrl={shown.url} handler={shown.handler} onEvent={onEvent} style={styles.webView} />
          ) : null}
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: {
    height: 48,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  close: { position: 'absolute', left: 16, zIndex: 1, minHeight: 44, justifyContent: 'center' },
  closeLabel: { fontFamily: fonts.medium, fontSize: 16, color: colors.accent },
  pressed: { opacity: 0.6 },
  title: { fontFamily: fonts.semibold, fontSize: 16, color: colors.text, textAlign: 'center' },
  // The ceremony runs to the bottom edge and keeps its own content clear of the home indicator.
  webView: { flex: 1, backgroundColor: colors.card },
});
