import { Platform } from 'react-native';
import type { z } from 'zod';
import { EnvelopeSummary, ErrorBody, ReplacedCeremony, StartedCeremony } from './schemas';

export class DemoServerError extends Error {
  override name = 'DemoServerError';
}

/**
 * Client for the demo server (../server). The app never calls SignatureAPI
 * directly: an API key in an app bundle is a leaked API key.
 */
export class DemoServerClient {
  constructor(private readonly baseUrl: string) {}

  /** Creates the sample envelope and returns the signer's ceremony URL. */
  startCeremony(language: string): Promise<StartedCeremony> {
    // Includes waiting for SignatureAPI to process the envelope.
    return this.send(StartedCeremony, 'POST', 'ceremonies', { name: 'Demo Signer', language }, 60_000);
  }

  /** Replaces the signer's ceremony. The previous URL stops working at once. */
  async replaceCeremony(recipientId: string): Promise<string> {
    const replaced = await this.send(ReplacedCeremony, 'POST', `recipients/${encodeURIComponent(recipientId)}/ceremony`, {});
    return replaced.ceremonyUrl;
  }

  envelope(envelopeId: string): Promise<EnvelopeSummary> {
    return this.send(EnvelopeSummary, 'GET', `envelopes/${encodeURIComponent(envelopeId)}`);
  }

  private async send<Schema extends z.ZodType>(
    schema: Schema,
    method: 'GET' | 'POST',
    path: string,
    body?: object,
    timeoutMs = 20_000,
  ): Promise<z.infer<Schema>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl.replace(/\/+$/, '')}/${path}`, {
        method,
        headers: body ? { Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch {
      throw new DemoServerError(unreachableMessage(this.baseUrl));
    } finally {
      clearTimeout(timer);
    }

    const payload: unknown = await response.json().catch(() => undefined);
    if (!response.ok) {
      const detail = ErrorBody.safeParse(payload);
      throw new DemoServerError(
        `The demo server returned ${response.status}: ${detail.success ? detail.data.error : `HTTP ${response.status}`}`,
      );
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new DemoServerError(`The demo server sent an unexpected response to ${method} /${path}.`);
    }
    return parsed.data;
  }
}

function unreachableMessage(baseUrl: string): string {
  const hint = Platform.OS === 'android' ? ' (for a USB device: adb reverse tcp:3000 tcp:3000)' : '';
  return `Couldn’t reach the demo server at ${baseUrl}. Check that it is running and that this device can reach it${hint}.`;
}
