import { z } from "zod";
import { LANGUAGES } from "../signatureapi/types.ts";

/** An https URL reduced to its origin, e.g. "https://app.example.com/x" -> "https://app.example.com". */
const HttpsOrigin = z
  .url({ protocol: /^https$/, error: "embedOrigin must be an https origin" })
  .transform((value) => new URL(value).origin);

export const StartCeremonyBody = z.object({
  name: z.string().trim().min(1).max(500).default("Demo Signer"),
  email: z.email().default("signer@example.com"),
  language: z.enum(LANGUAGES).default("en"),
  embedOrigin: HttpsOrigin.nullable().default(null),
  // Seconds the ceremony shows its own result page before handing back to the
  // app. 0 returns control immediately, so the app shows the outcome itself.
  redirectDelay: z.number().int().min(0).max(20).default(0),
});

export const ReplaceCeremonyBody = z.object({
  embedOrigin: HttpsOrigin.nullable().default(null),
});

export const EnvelopeParams = z.object({ envelopeId: z.guid() });
export const RecipientParams = z.object({ recipientId: z.string().regex(/^re_[A-Za-z0-9]+$/, "recipientId must look like re_...") });
