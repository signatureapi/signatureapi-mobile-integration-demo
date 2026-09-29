import { URL as ExpoURL } from 'whatwg-url-minimum';
import { EVENT_URLS } from './support/eventUrls';

// What the published React Native sample (signatureapi.com/docs/embedded/react-native)
// gets from `new URL(url)` for each event URL, depending on which `URL` the app has:
//
// - Bare React Native: React Native installs its own `URL` polyfill as the
//   global (Libraries/Core/setUpXHR.js), replacing anything the engine,
//   Hermes included, provides. This loads that same module.
// - Expo: SDK 57 replaces it with `whatwg-url-minimum` (expo/src/winter/runtime.native.ts),
//   pinned here to the version expo@57 depends on.
// - Node's `URL`, the WHATWG reference, for comparison.
//
// It runs in Jest, so on Node, not on Hermes. The polyfill is plain JavaScript
// with no engine-specific paths, so it behaves the same on Hermes.

type URLLike = { protocol: string; host: string; searchParams: { get(name: string): string | null } };
type URLConstructor = new (url: string) => URLLike;

// The module itself is the point of this test, not its public export.
// eslint-disable-next-line @react-native/no-deep-imports
const { URL: ReactNativeURL, URLSearchParams: ReactNativeURLSearchParams } = require('react-native/Libraries/Blob/URL') as {
  URL: URLConstructor;
  URLSearchParams: typeof URLSearchParams;
};

/** The published sample's handler, reduced to what it decides. */
function publishedSample(URLImpl: URLConstructor, url: string): string {
  try {
    const parsedUrl = new URLImpl(url);
    if (parsedUrl.protocol !== 'signatureapi-message:') return 'not an event';
    switch (parsedUrl.host) {
      case 'ceremony.completed':
      case 'ceremony.canceled':
      case 'ceremony.failed':
        return parsedUrl.host;
      default:
        return `unhandled event "${parsedUrl.host}"`;
    }
  } catch {
    return 'threw';
  }
}

function searchParams(URLImpl: URLConstructor, url: string) {
  try {
    const { searchParams: params } = new URLImpl(url);
    return { errorType: params.get('error_type'), errorMessage: params.get('error_message') };
  } catch {
    return 'threw';
  }
}

describe('bare React Native URL polyfill', () => {
  // The polyfill's `searchParams` looks up the global URLSearchParams, which
  // React Native also replaces. Do the same here, as on a device.
  const nodeURLSearchParams = globalThis.URLSearchParams;
  beforeAll(() => {
    globalThis.URLSearchParams = ReactNativeURLSearchParams;
  });
  afterAll(() => {
    globalThis.URLSearchParams = nodeURLSearchParams;
  });

  it.each(EVENT_URLS)('loses the event type: $name', ({ url, event }) => {
    // `host` only understands http(s) URLs, so it returns "" for this scheme.
    expect(new ReactNativeURL(url).host).toBe('');
    expect(publishedSample(ReactNativeURL, url)).not.toBe(event.type);
  });

  it('matches the scheme but reports an unhandled event with an empty type', () => {
    expect(publishedSample(ReactNativeURL, 'signatureapi-message://ceremony.completed')).toBe('unhandled event ""');
  });

  it('still reads hosts of https URLs', () => {
    expect(new ReactNativeURL('https://sign.signatureapi.com/en/start?token=t').host).toBe('sign.signatureapi.com');
  });

  it('cuts a value at a raw "=" and throws on a malformed escape', () => {
    const byName = Object.fromEntries(EVENT_URLS.map(({ name, url }) => [name, searchParams(ReactNativeURL, url)]));
    expect(byName['failed, form-encoded message ("+" is a space)']).toEqual({
      errorType: 'unauthorized',
      errorMessage: 'This link is no longer valid.',
    });
    expect(byName['failed, raw "=" inside the value']).toEqual({ errorType: 'already_completed', errorMessage: 'a' });
    expect(byName['failed, malformed escape in the message']).toBe('threw');
  });
});

describe.each([
  ['Expo (whatwg-url-minimum)', ExpoURL as unknown as URLConstructor],
  ['Node (WHATWG reference)', URL as unknown as URLConstructor],
])('%s URL', (_name, URLImpl) => {
  it.each(EVENT_URLS)('reads the event type: $name', ({ url, event }) => {
    expect(publishedSample(URLImpl, url)).toBe(event.type);
  });

  it.each(EVENT_URLS)('reads the error fields: $name', ({ url, event }) => {
    expect(searchParams(URLImpl, url)).toEqual({ errorType: event.errorType, errorMessage: event.errorMessage });
  });
});
