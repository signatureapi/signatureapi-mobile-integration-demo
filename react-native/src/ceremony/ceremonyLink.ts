/**
 * Turns the ceremony URL from the server into the URL the WebView loads.
 *
 * `embedded=true` adapts the ceremony UI; `event_delivery=redirect` makes it
 * report its ending as a `signatureapi-message://` navigation. Existing values
 * of either parameter are replaced, everything else is kept as sent.
 */
export function embeddedCeremonyUrl(ceremonyUrl: string): string {
  const hashIndex = ceremonyUrl.indexOf('#');
  const withoutHash = hashIndex === -1 ? ceremonyUrl : ceremonyUrl.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : ceremonyUrl.slice(hashIndex);

  const queryIndex = withoutHash.indexOf('?');
  const base = queryIndex === -1 ? withoutHash : withoutHash.slice(0, queryIndex);
  const kept =
    queryIndex === -1
      ? []
      : withoutHash
          .slice(queryIndex + 1)
          .split('&')
          .filter(pair => pair && !isOverridden(pair));

  return `${base}?${[...kept, 'embedded=true', 'event_delivery=redirect'].join('&')}${hash}`;
}

function isOverridden(pair: string): boolean {
  const name = pair.split('=', 1)[0];
  return name === 'embedded' || name === 'event_delivery';
}
