import assert from "node:assert/strict";
import { it } from "node:test";
import { ConfigError, loadConfig } from "../src/config.ts";

// The one unit test worth keeping: a live key must be refused, and the refusal
// must not echo the key into logs or terminal output.
it("refuses a live key without echoing it", () => {
  const secret = "key_live_supersecretvalue";
  assert.throws(
    () => loadConfig({ SIGNATUREAPI_KEY: secret }),
    (err: unknown) => err instanceof ConfigError && /test-mode key/.test(err.message) && !err.message.includes(secret),
  );
});
