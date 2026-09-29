import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

/**
 * Codegen spec for the app's own Turbo Native Module (ios/SignatureAPIDemo/RCTDemoConfig.mm,
 * android/…/config/DemoConfigModule.kt). It exposes the two places the native
 * apps read their configuration from.
 */
export interface Spec extends TurboModule {
  /** A value baked in at build time: an Info.plist key on iOS, a manifest `<meta-data>` on Android. */
  buildSetting(name: string): string | null;
  /** A launch argument (iOS) or intent extra (Android), as passed by a test runner such as Maestro. */
  launchArgument(name: string): string | null;
}

export default TurboModuleRegistry.getEnforcing<Spec>('DemoConfig');
