import express, { type ErrorRequestHandler, type Express } from "express";
import { ZodError } from "zod";
import { ConflictError, type CeremonyService } from "../ceremonies.ts";
import { SignatureApiError } from "../signatureapi/client.ts";
import { EnvelopeParams, RecipientParams, ReplaceCeremonyBody, StartCeremonyBody } from "./schemas.ts";

export interface Logger {
  info(message: string): void;
  error(message: string): void;
}

/**
 * HTTP API consumed by the mobile demos.
 *
 * Ceremony URLs are bearer credentials: anyone holding one can sign. They are
 * returned to the app but never logged. This demo has no user authentication;
 * a real backend must check that the caller is the signer before returning one.
 */
export function createApp(service: CeremonyService, logger: Logger = console): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "10kb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Creates a one-signer test envelope and returns the signer's ceremony URL.
  app.post("/ceremonies", async (req, res) => {
    const input = StartCeremonyBody.parse(req.body ?? {});
    const started = await service.start(input);
    logger.info(`envelope ${started.envelopeId} ready (language=${input.language}, embedOrigin=${input.embedOrigin ?? "none"})`);
    res.status(201).json(started);
  });

  // Returns a URL for the signer's current ceremony without replacing it, so an
  // app killed mid-ceremony can resume without persisting the URL on the device.
  // SignatureAPI re-issues the token on every read: expect a different URL for
  // the same ceremony each time.
  app.get("/envelopes/:envelopeId/ceremony-url", async (req, res) => {
    const { envelopeId } = EnvelopeParams.parse(req.params);
    res.json(await service.current(envelopeId));
  });

  // Server-side truth. A ceremony.completed event in the app is a UI signal,
  // not proof: confirm here (or with a webhook) before acting on it.
  app.get("/envelopes/:envelopeId", async (req, res) => {
    const { envelopeId } = EnvelopeParams.parse(req.params);
    res.json(await service.summary(envelopeId));
  });

  // Replaces the signer's ceremony. The previous URL stops working at once.
  app.post("/recipients/:recipientId/ceremony", async (req, res) => {
    const { recipientId } = RecipientParams.parse(req.params);
    const { embedOrigin } = ReplaceCeremonyBody.parse(req.body ?? {});
    const replaced = await service.replace(recipientId, embedOrigin);
    logger.info(`new ceremony for recipient ${recipientId} (embedOrigin=${embedOrigin ?? "none"})`);
    res.status(201).json(replaced);
  });

  app.use(errorHandler(logger));
  return app;
}

function errorHandler(logger: Logger): ErrorRequestHandler {
  return (err, _req, res, _next) => {
    if (err instanceof ZodError) {
      res.status(400).json({ error: "Invalid request", issues: err.issues.map(({ path, message }) => ({ path: path.join("."), message })) });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ error: err.message });
      return;
    }
    if (err instanceof SignatureApiError) {
      logger.error(err.message);
      // A missing envelope or recipient is the caller's problem; anything else is ours.
      res.status(err.status === 404 ? 404 : 502).json({ error: err.message });
      return;
    }
    logger.error(err instanceof Error ? err.message : String(err));
    res.status(500).json({ error: "Internal error" });
  };
}
