/**
 * A terminal event from an embedded ceremony.
 *
 * With `event_delivery=redirect` the ceremony reports how it ended by
 * navigating to `signatureapi-message://<type>/?error_type=…&error_message=…`.
 * Branch on `type` and `errorType` only: `errorMessage` is user-facing copy.
 */
export interface CeremonyEvent {
  type: string;
  errorType: string | null;
  errorMessage: string | null;
}

export const CEREMONY_EVENT_SCHEME = 'signatureapi-message';

export const isCompleted = (event: CeremonyEvent) => event.type === 'ceremony.completed';
export const isCanceled = (event: CeremonyEvent) => event.type === 'ceremony.canceled';

// scheme://authority[path][?query][#fragment]
const EVENT_URL = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)[^?#]*(?:\?([^#]*))?/i;

/**
 * Returns the event a `signatureapi-message://` URL describes, or null for any other URL.
 *
 * Deliberately not `new URL(url)`: in bare React Native the global `URL` is a
 * partial polyfill whose `host` only understands http(s) URLs, so it returns
 * "" for this scheme. See __tests__/url-behavior.test.ts.
 */
export function parseCeremonyEvent(url: string): CeremonyEvent | null {
  const match = EVENT_URL.exec(url);
  if (!match || match[1]?.toLowerCase() !== CEREMONY_EVENT_SCHEME) return null;
  const type = match[2];
  if (!type) return null;

  const query = parseQuery(match[3] ?? '');
  return {
    type,
    errorType: query.get('error_type') ?? null,
    errorMessage: query.get('error_message') ?? null,
  };
}

/** Form-encoded query → first value per name. */
function parseQuery(query: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const separator = pair.indexOf('=');
    const name = decodeFormComponent(separator === -1 ? pair : pair.slice(0, separator));
    const value = separator === -1 ? '' : decodeFormComponent(pair.slice(separator + 1));
    if (!values.has(name)) values.set(name, value);
  }
  return values;
}

/**
 * Decodes one form-encoded component: "+" means a space, then percent-decoding.
 * A malformed escape is kept as written rather than dropping the whole event.
 */
function decodeFormComponent(component: string): string {
  const spaced = component.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(spaced);
  } catch {
    return spaced.replace(/(?:%[0-9a-f]{2})+/gi, run => {
      try {
        return decodeURIComponent(run);
      } catch {
        return run;
      }
    });
  }
}
