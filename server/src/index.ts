import { readFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { ConfigError, loadConfig } from "./config.ts";
import { createCeremonyService } from "./ceremonies.ts";
import { createApp } from "./http/app.ts";
import { SignatureApiClient } from "./signatureapi/client.ts";

const SAMPLE_PDF = new URL("../assets/sample.pdf", import.meta.url);

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new SignatureApiClient({ apiKey: config.SIGNATUREAPI_KEY, baseUrl: config.SIGNATUREAPI_BASE_URL });
  const service = createCeremonyService({ client, documentPdf: new Uint8Array(await readFile(SAMPLE_PDF)) });

  // All interfaces, so a phone on the same network can reach it.
  const server = createApp(service).listen(config.PORT, "0.0.0.0");
  server.once("listening", () => {
    const { port } = server.address() as AddressInfo;
    console.info(`Demo server listening on http://0.0.0.0:${port} (SignatureAPI test mode)`);
  });
  server.once("error", (err: NodeJS.ErrnoException) => {
    console.error(err.code === "EADDRINUSE" ? `Port ${config.PORT} is already in use. Set PORT in .env to another port.` : err.message);
    process.exit(1);
  });

  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((err: unknown) => {
  console.error(err instanceof ConfigError ? err.message : err);
  process.exit(1);
});
