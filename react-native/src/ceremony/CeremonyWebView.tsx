import { useCallback, useEffect, useMemo, useRef, type ComponentType, type RefAttributes } from 'react';
import { Linking, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';
import type { CeremonyHandler } from '../config/appConfig';
import { parseCeremonyEvent, type CeremonyEvent } from './ceremonyEvent';
import { embeddedCeremonyUrl } from './ceremonyLink';

// react-native-webview 14 types its component as `WebView<P = undefined>` with
// props `WebViewProps & P`, which strict null checks reduce to `never`. Pin P.
type WebViewHandle = WebView<object>;
const TypedWebView = WebView as unknown as ComponentType<WebViewProps & RefAttributes<WebViewHandle>>;

type ShouldStartLoad = NonNullable<WebViewProps['onShouldStartLoadWithRequest']>;
type NavigationStateChange = NonNullable<WebViewProps['onNavigationStateChange']>;

/**
 * react-native-webview checks every navigation against this list before any
 * callback runs, and hands a URL that fails it to `Linking.openURL` instead.
 * The default list (http and https) would send `signatureapi-message://` to the
 * OS, so neither handler would ever see the event. "*" lets every navigation
 * reach the handler, as `decidePolicyFor` and `shouldOverrideUrlLoading` do in
 * the native apps; the handler decides.
 */
const ORIGIN_WHITELIST = ['*'];

interface Props {
  ceremonyUrl: string;
  handler: CeremonyHandler;
  onEvent: (event: CeremonyEvent) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shows a SignatureAPI ceremony as the WebView's page and reports how it ended.
 *
 * The ceremony signals its end by navigating to `signatureapi-message://…`.
 * With the default `shouldStart` handler, `onShouldStartLoadWithRequest` sees
 * that navigation first, cancels it, and hands the event to the app. The
 * `navigationState` handler reproduces the published docs sample instead (see
 * config/appConfig.ts).
 *
 * The ceremony needs no cookies or web storage, so both stay off on Android;
 * iOS keeps the WKWebView defaults, as the native app does.
 */
export function CeremonyWebView({ ceremonyUrl, handler, onEvent, style }: Props) {
  const webView = useRef<WebViewHandle>(null);
  const ended = useRef(false);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const source = useMemo(() => ({ uri: embeddedCeremonyUrl(ceremonyUrl) }), [ceremonyUrl]);

  // `via` names the callback that caught the event, so a device log shows which handler delivered it.
  const end = useCallback((event: CeremonyEvent, via: string) => {
    if (ended.current) return;
    ended.current = true;
    console.info(`[ceremony] ${event.type} via ${via}`);
    onEventRef.current(event);
  }, []);

  // Android waits at most 250 ms for this answer on its UI thread, then lets
  // the load go ahead. The event is still delivered; only the cancel is lost.
  const onShouldStartLoadWithRequest = useCallback<ShouldStartLoad>(
    request => {
      const event = parseCeremonyEvent(request.url);
      if (!event) return true;
      end(event, 'onShouldStartLoadWithRequest');
      return false;
    },
    [end],
  );

  const onNavigationStateChange = useCallback<NavigationStateChange>(
    navigation => {
      const event = parseCeremonyEvent(navigation.url);
      if (event) end(event, 'onNavigationStateChange');
    },
    [end],
  );

  const interception: Partial<WebViewProps> = handler === 'shouldStart' ? { onShouldStartLoadWithRequest } : { onNavigationStateChange };

  return (
    <TypedWebView
      ref={webView}
      source={source}
      originWhitelist={ORIGIN_WHITELIST}
      {...interception}
      // Links that ask for a new window, such as "Powered by SignatureAPI", open in the browser.
      onOpenWindow={({ nativeEvent }) => openExternally(nativeEvent.targetUrl)}
      // iOS may kill the web process under memory pressure, typically while the
      // app is in the background. Reload the same link: it stays valid.
      onContentProcessDidTerminate={() => webView.current?.reload()}
      // A crashed Android renderer can't be reused. Report it and let the screen close.
      onRenderProcessGone={() =>
        end(
          { type: 'ceremony.failed', errorType: 'webview_crashed', errorMessage: 'The signing page stopped unexpectedly.' },
          'onRenderProcessGone',
        )
      }
      allowsBackForwardNavigationGestures={false}
      domStorageEnabled={false}
      thirdPartyCookiesEnabled={false}
      webviewDebuggingEnabled={__DEV__}
      testID="ceremony-webview"
      style={style}
    />
  );
}

function openExternally(url: string) {
  if (!/^https:\/\//i.test(url)) return;
  Linking.openURL(url).catch(() => {
    // No browser available: stay on the ceremony.
  });
}
