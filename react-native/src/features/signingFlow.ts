import { useState, useSyncExternalStore } from 'react';
import { isCanceled, isCompleted, type CeremonyEvent } from '../ceremony/ceremonyEvent';
import { readAppConfig, type AppConfig, type CeremonyHandler } from '../config/appConfig';
import { DemoServerClient } from '../networking/demoServerClient';
import { signerCompleted } from '../networking/schemas';

export interface Ceremony {
  envelopeId: string;
  url: string;
  handler: CeremonyHandler;
}

export type Ending =
  | { kind: 'signed' }
  | { kind: 'canceled' }
  | { kind: 'couldNotOpen'; reason: string }
  | { kind: 'notConfirmed'; reason: string };

/** ready → preparing → signing → confirming → finished. `error` explains why the last start failed. */
export type Phase =
  | { name: 'ready'; error: string | null }
  | { name: 'preparing' }
  | { name: 'signing'; ceremony: Ceremony }
  | { name: 'confirming' }
  | { name: 'finished'; ending: Ending };

const CONFIRM_ATTEMPTS = 12;
const CONFIRM_INTERVAL_MS = 1_500;

/** The whole demo: create a sample envelope, sign it, report how it ended. */
export class SigningFlow {
  private current: Phase = { name: 'ready', error: null };
  private readonly listeners = new Set<() => void>();
  /** Bumped whenever the flow moves on, so a late server reply can't overwrite a newer phase. */
  private generation = 0;

  constructor(private readonly loadConfig: () => AppConfig = readAppConfig, private readonly language: () => string = ceremonyLanguage) {}

  get phase(): Phase {
    return this.current;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start = async () => {
    if (this.current.name === 'preparing') return;
    const run = this.moveTo({ name: 'preparing' });
    try {
      const config = this.loadConfig();
      const client = new DemoServerClient(config.demoServerUrl);
      const started = await client.startCeremony(this.language());
      if (config.simulateRevokedLink) {
        // Test hook: a newer ceremony revokes this one, so opening it must fail.
        await client.replaceCeremony(started.recipientId);
      }
      const ceremony = { envelopeId: started.envelopeId, url: started.ceremonyUrl, handler: config.ceremonyHandler };
      this.moveTo({ name: 'signing', ceremony }, run);
    } catch (error) {
      this.moveTo({ name: 'ready', error: messageOf(error, 'Couldn’t create the sample envelope.') }, run);
    }
  };

  ceremonyEnded = async (event: CeremonyEvent) => {
    if (this.current.name !== 'signing') return;
    const { envelopeId } = this.current.ceremony;
    if (isCompleted(event)) {
      const run = this.moveTo({ name: 'confirming' });
      this.moveTo({ name: 'finished', ending: await this.confirmSignature(envelopeId) }, run);
    } else if (isCanceled(event)) {
      this.moveTo({ name: 'finished', ending: { kind: 'canceled' } });
    } else {
      this.moveTo({ name: 'finished', ending: { kind: 'couldNotOpen', reason: explanation(event) } });
    }
  };

  /** The signer left through the app's own Close button or Android's back gesture. */
  closeCeremony = () => {
    if (this.current.name === 'signing') this.moveTo({ name: 'finished', ending: { kind: 'canceled' } });
  };

  backToStart = () => {
    this.moveTo({ name: 'ready', error: null });
  };

  /**
   * `ceremony.completed` is a UI signal. The envelope on the server is the
   * proof, and its status can take a moment to catch up.
   */
  private async confirmSignature(envelopeId: string): Promise<Ending> {
    try {
      const client = new DemoServerClient(this.loadConfig().demoServerUrl);
      for (let attempt = 0; attempt < CONFIRM_ATTEMPTS; attempt++) {
        if (signerCompleted(await client.envelope(envelopeId))) return { kind: 'signed' };
        await new Promise<void>(resolve => setTimeout(resolve, CONFIRM_INTERVAL_MS));
      }
      return { kind: 'notConfirmed', reason: 'SignatureAPI hasn’t confirmed the signature yet. It usually takes a few seconds.' };
    } catch (error) {
      return { kind: 'notConfirmed', reason: messageOf(error, 'Couldn’t check the signature with the demo server.') };
    }
  }

  /** Moves to `phase`. With `run`, only if nothing else happened since that run began. */
  private moveTo(phase: Phase, run?: number): number {
    if (run !== undefined && run !== this.generation) return this.generation;
    this.current = phase;
    this.generation += 1;
    this.listeners.forEach(listener => listener());
    return this.generation;
  }
}

/** One flow per app instance, re-rendering on every phase change. */
export function useSigningFlow(): { flow: SigningFlow; phase: Phase } {
  const [flow] = useState(() => new SigningFlow());
  const phase = useSyncExternalStore(flow.subscribe, () => flow.phase);
  return { flow, phase };
}

function explanation(event: CeremonyEvent): string {
  switch (event.errorType) {
    case 'unauthorized':
      return 'This signing link is no longer valid. Start again to get a new one.';
    case 'already_completed':
      return 'This document has already been signed.';
    case 'not_available':
      return 'This document is no longer available for signing.';
    default:
      return 'The signing session couldn’t be completed. Start again to get a new link.';
  }
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const SUPPORTED_LANGUAGES = new Set(['en', 'es', 'fr', 'it', 'pt', 'de', 'zh', 'hu', 'nl']);

/** The device language when SignatureAPI supports it, English otherwise. */
export function ceremonyLanguage(locale: string = Intl.DateTimeFormat().resolvedOptions().locale): string {
  const code = locale.split(/[-_]/)[0]?.toLowerCase() ?? 'en';
  return SUPPORTED_LANGUAGES.has(code) ? code : 'en';
}
