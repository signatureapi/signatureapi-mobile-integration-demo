import { isCanceled, isCompleted, parseCeremonyEvent } from '../src/ceremony/ceremonyEvent';
import { embeddedCeremonyUrl } from '../src/ceremony/ceremonyLink';
import { EVENT_URLS, OTHER_URLS } from './support/eventUrls';

describe('parseCeremonyEvent', () => {
  it.each(EVENT_URLS)('parses $name', ({ url, event }) => {
    expect(parseCeremonyEvent(url)).toEqual(event);
  });

  it.each(OTHER_URLS)('ignores %s', url => {
    expect(parseCeremonyEvent(url)).toBeNull();
  });

  it('classifies the outcome by type only', () => {
    const completed = parseCeremonyEvent('signatureapi-message://ceremony.completed')!;
    const canceled = parseCeremonyEvent('signatureapi-message://ceremony.canceled')!;
    expect([isCompleted(completed), isCanceled(completed)]).toEqual([true, false]);
    expect([isCompleted(canceled), isCanceled(canceled)]).toEqual([false, true]);
  });
});

describe('embeddedCeremonyUrl', () => {
  it('adds the embedding parameters and keeps the token', () => {
    expect(embeddedCeremonyUrl('https://sign.signatureapi.com/en/start?token=a.b-c_d')).toBe(
      'https://sign.signatureapi.com/en/start?token=a.b-c_d&embedded=true&event_delivery=redirect',
    );
  });

  it('replaces existing values and keeps the fragment', () => {
    expect(embeddedCeremonyUrl('https://sign.signatureapi.com/en/start?embedded=false&token=t&event_delivery=post_message#x')).toBe(
      'https://sign.signatureapi.com/en/start?token=t&embedded=true&event_delivery=redirect#x',
    );
  });

  it('works without a query', () => {
    expect(embeddedCeremonyUrl('https://sign.signatureapi.com/en/start')).toBe(
      'https://sign.signatureapi.com/en/start?embedded=true&event_delivery=redirect',
    );
  });
});
