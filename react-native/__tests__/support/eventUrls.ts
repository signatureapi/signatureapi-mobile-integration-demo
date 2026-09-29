import type { CeremonyEvent } from '../../src/ceremony/ceremonyEvent';

/**
 * Event URLs as a ceremony sends them, and what each must parse to. Shared by
 * the parser test and the test of the published `new URL()` approach.
 */
export const EVENT_URLS: ReadonlyArray<{ name: string; url: string; event: CeremonyEvent }> = [
  {
    name: 'completed, bare',
    url: 'signatureapi-message://ceremony.completed',
    event: { type: 'ceremony.completed', errorType: null, errorMessage: null },
  },
  {
    name: 'completed, with path and empty query',
    url: 'signatureapi-message://ceremony.completed/?',
    event: { type: 'ceremony.completed', errorType: null, errorMessage: null },
  },
  {
    name: 'canceled',
    url: 'signatureapi-message://ceremony.canceled/',
    event: { type: 'ceremony.canceled', errorType: null, errorMessage: null },
  },
  {
    name: 'failed, form-encoded message ("+" is a space)',
    url: 'signatureapi-message://ceremony.failed/?error_type=unauthorized&error_message=This+link+is+no+longer+valid.',
    event: { type: 'ceremony.failed', errorType: 'unauthorized', errorMessage: 'This link is no longer valid.' },
  },
  {
    name: 'failed, percent-encoded message with an encoded "+", "=" and "&"',
    url: 'signatureapi-message://ceremony.failed/?error_type=not_available&error_message=1%2B1%3D2%20%26%20caf%C3%A9',
    event: { type: 'ceremony.failed', errorType: 'not_available', errorMessage: '1+1=2 & café' },
  },
  {
    name: 'failed, raw "=" inside the value',
    url: 'signatureapi-message://ceremony.failed/?error_type=already_completed&error_message=a=b',
    event: { type: 'ceremony.failed', errorType: 'already_completed', errorMessage: 'a=b' },
  },
  {
    name: 'failed, malformed escape in the message',
    url: 'signatureapi-message://ceremony.failed/?error_type=unauthorized&error_message=100%+sure%20now',
    event: { type: 'ceremony.failed', errorType: 'unauthorized', errorMessage: '100% sure now' },
  },
  {
    name: 'uppercase scheme, fragment, repeated parameter (first wins)',
    url: 'SIGNATUREAPI-MESSAGE://ceremony.failed/?error_type=unauthorized&error_type=other#ignored',
    event: { type: 'ceremony.failed', errorType: 'unauthorized', errorMessage: null },
  },
];

/** URLs that are not ceremony events and must pass through. */
export const OTHER_URLS: readonly string[] = [
  'https://sign.signatureapi.com/en/start?token=abc&embedded=true&event_delivery=redirect',
  'about:blank',
  'signatureapi-message:ceremony.completed',
  'signatureapi-message:///?error_type=unauthorized',
  'signatureapi-messages://ceremony.completed',
];
