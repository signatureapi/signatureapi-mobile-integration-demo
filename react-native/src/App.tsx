import { StatusBar, StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './design/theme';
import { CeremonyScreen } from './features/CeremonyScreen';
import { ResultScreen } from './features/ResultScreen';
import { useSigningFlow, type Phase, type SigningFlow } from './features/signingFlow';
import { StartScreen } from './features/StartScreen';

export function App() {
  const { flow, phase } = useSigningFlow();
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.root}>
        {/* No cross-fade between phases: the ceremony's own slide is the
            transition, and fading text over text reads as a glitch. */}
        <Screen phase={phase} flow={flow} />
      </SafeAreaView>
      <CeremonyScreen
        ceremony={phase.name === 'signing' ? phase.ceremony : null}
        onEvent={flow.ceremonyEnded}
        onClose={flow.closeCeremony}
      />
    </SafeAreaProvider>
  );
}

function Screen({ phase, flow }: { phase: Phase; flow: SigningFlow }) {
  switch (phase.name) {
    case 'ready':
      return <StartScreen isPreparing={false} error={phase.error} onSign={flow.start} />;
    case 'preparing':
    case 'signing':
      return <StartScreen isPreparing={phase.name === 'preparing'} error={null} onSign={flow.start} />;
    case 'confirming':
      return <ResultScreen ending={null} onDone={flow.backToStart} onStartAgain={flow.start} />;
    case 'finished':
      return <ResultScreen ending={phase.ending} onDone={flow.backToStart} onStartAgain={flow.start} />;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
