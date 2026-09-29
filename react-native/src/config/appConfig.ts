import { z } from 'zod';
import NativeDemoConfig from './specs/NativeDemoConfig';

/**
 * Which WebView callback intercepts `signatureapi-message://` navigations.
 *
 * - `shouldStart`: `onShouldStartLoadWithRequest`, which runs before the load
 *   and cancels it. The counterpart of `decidePolicyFor` (iOS) and
 *   `shouldOverrideUrlLoading` (Android). The default.
 * - `navigationState`: `onNavigationStateChange`, as in the published React
 *   Native docs sample. It reports a navigation after it started and can't
 *   cancel it. Kept so a test run can compare the two on real devices.
 */
export const CeremonyHandler = z.enum(['shouldStart', 'navigationState']);
export type CeremonyHandler = z.infer<typeof CeremonyHandler>;

export interface AppConfig {
  demoServerUrl: string;
  ceremonyHandler: CeremonyHandler;
  /**
   * Test hook for the failure path: after creating the envelope, replace the
   * signer's ceremony and open the old, now revoked, link.
   */
  simulateRevokedLink: boolean;
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

const DemoServerUrl = z.url({ protocol: /^https?$/ });

/**
 * Reads the configuration the way the native apps do: the value from the
 * build, unless a launch argument overrides it.
 *
 *   Setting                Build (iOS / Android)                     Launch argument
 *   demo server address    DEMO_SERVER_URL / -PdemoServerUrl         demoServerUrl
 *   ceremony handler       CEREMONY_HANDLER / -PceremonyHandler      ceremonyHandler
 *   revoked-link test hook (none)                                    simulateRevokedLink
 */
export function readAppConfig(source: Pick<typeof NativeDemoConfig, 'buildSetting' | 'launchArgument'> = NativeDemoConfig): AppConfig {
  const value = (argument: string, buildSetting?: string) =>
    nonEmpty(source.launchArgument(argument)) ?? (buildSetting ? nonEmpty(source.buildSetting(buildSetting)) : undefined);

  const serverUrl = value('demoServerUrl', 'DemoServerURL') ?? '';
  if (!DemoServerUrl.safeParse(serverUrl).success) {
    throw new ConfigError(
      `The demo server address “${serverUrl}” is not valid. Set DEMO_SERVER_URL (iOS) or demoServerUrl (Android) when building.`,
    );
  }

  const handler = value('ceremonyHandler', 'CeremonyHandler') ?? 'shouldStart';
  const parsedHandler = CeremonyHandler.safeParse(handler);
  if (!parsedHandler.success) {
    throw new ConfigError(`Unknown ceremony handler “${handler}”. Use one of: ${CeremonyHandler.options.join(', ')}.`);
  }

  return {
    demoServerUrl: serverUrl,
    ceremonyHandler: parsedHandler.data,
    simulateRevokedLink: value('simulateRevokedLink') === 'true',
  };
}

function nonEmpty(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
