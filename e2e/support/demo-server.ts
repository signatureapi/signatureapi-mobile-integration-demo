import type { APIRequestContext } from "@playwright/test";

// Typed client for the demo server's HTTP API: the same calls the apps make.

export interface StartedCeremony {
  envelopeId: string;
  recipientId: string;
  ceremonyUrl: string;
  embedOrigin: string | null;
}

export interface EnvelopeSummary {
  envelopeId: string;
  status: string;
  completedAt: string | null;
  recipients: Array<{ key: string; type: string; status: string }>;
}

export interface StartOptions {
  language?: string;
  embedOrigin?: string | null;
  redirectDelay?: number;
}

async function json<T>(response: Awaited<ReturnType<APIRequestContext["get"]>>): Promise<T> {
  if (!response.ok()) throw new Error(`${response.url()} -> ${response.status()}: ${await response.text()}`);
  return (await response.json()) as T;
}

export async function startCeremony(request: APIRequestContext, options: StartOptions = {}): Promise<StartedCeremony> {
  // Delay 0 keeps the suite fast; the default (3 s) is covered in one test.
  return json(await request.post("/ceremonies", { data: { redirectDelay: 0, ...options } }));
}

export async function replaceCeremony(request: APIRequestContext, recipientId: string, embedOrigin: string | null = null) {
  return json<{ ceremonyUrl: string }>(await request.post(`/recipients/${recipientId}/ceremony`, { data: { embedOrigin } }));
}

export async function envelopeSummary(request: APIRequestContext, envelopeId: string): Promise<EnvelopeSummary> {
  return json(await request.get(`/envelopes/${envelopeId}`));
}

export async function signerStatus(request: APIRequestContext, envelopeId: string): Promise<string | undefined> {
  return (await envelopeSummary(request, envelopeId)).recipients.find((r) => r.key === "signer")?.status;
}
