import { z } from 'zod';

// The demo server's responses (../server/src/http/app.ts), checked before use.
// Unknown fields are ignored so the server can grow without breaking the app.

export const StartedCeremony = z.object({
  envelopeId: z.string().min(1),
  recipientId: z.string().min(1),
  ceremonyUrl: z.url({ protocol: /^https$/ }),
});
export type StartedCeremony = z.infer<typeof StartedCeremony>;

export const ReplacedCeremony = z.object({
  ceremonyUrl: z.url({ protocol: /^https$/ }),
});

export const EnvelopeSummary = z.object({
  status: z.string(),
  recipients: z.array(z.object({ key: z.string(), status: z.string() })),
});
export type EnvelopeSummary = z.infer<typeof EnvelopeSummary>;

export const ErrorBody = z.object({ error: z.string() });

export const signerCompleted = (envelope: EnvelopeSummary) =>
  envelope.recipients.some(recipient => recipient.key === 'signer' && recipient.status === 'completed');
