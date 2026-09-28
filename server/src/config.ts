import { z } from "zod";

const EnvSchema = z.object({
  SIGNATUREAPI_KEY: z
    .string({ error: "SIGNATUREAPI_KEY is not set. Copy .env.example to .env and add a test key." })
    .startsWith("key_test_", { error: "SIGNATUREAPI_KEY must be a test-mode key (key_test_...). This demo never runs against live mode." }),
  SIGNATUREAPI_BASE_URL: z.url({ protocol: /^https$/ }).default("https://api.signatureapi.com/v1"),
  PORT: z.coerce.number().int().min(0).max(65_535).default(3000),
});

export type Config = z.infer<typeof EnvSchema>;

export class ConfigError extends Error {
  override name = "ConfigError";
}

/**
 * Reads configuration from the environment. Error messages name the variable
 * and the rule it broke, never the value: the value may be an API key.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = EnvSchema.safeParse(env);
  if (!result.success) {
    throw new ConfigError(result.error.issues.map((issue) => issue.message).join("\n"));
  }
  return result.data;
}
