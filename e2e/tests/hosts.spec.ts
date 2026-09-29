import { expect, test } from "@playwright/test";
import { EventRecorder, openCeremony, signAndFinish } from "../support/ceremony.ts";
import { startCeremony } from "../support/demo-server.ts";

// The hosts a restricted app network must allow, as listed in
// docs/embedding-in-native-apps.md#cookies-and-web-storage.
const DOCUMENTED_HOSTS = [
  "sign.signatureapi.com",
  "api.signatureapi.com",
  "vault.signatureapi.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

/** CloudFront policies use a URL-safe base64: `-` for `+`, `_` for `=`, `~` for `/`. */
function policyExpiry(url: URL): number {
  const policy = url.searchParams.get("Policy");
  if (!policy) throw new Error("vault URL has no Policy parameter");
  const json = Buffer.from(policy.replace(/-/g, "+").replace(/_/g, "=").replace(/~/g, "/"), "base64").toString("utf8");
  const statement = (JSON.parse(json) as { Statement: Array<{ Condition: { DateLessThan: { "AWS:EpochTime": number } } }> })
    .Statement[0]!;
  return statement.Condition.DateLessThan["AWS:EpochTime"];
}

test("contacts only the documented hosts, with page images signed for an hour", async ({ page, request }) => {
  const ceremony = await startCeremony(request);
  const events = await EventRecorder.attach(page, "redirect");

  const hosts = new Set<string>();
  const vaultUrls: URL[] = [];
  page.on("request", (req) => {
    const url = new URL(req.url());
    if (url.protocol !== "https:") return; // signatureapi-message:// never reaches the network
    hosts.add(url.host);
    if (url.host === "vault.signatureapi.com") vaultUrls.push(url);
  });

  const loadedAt = Date.now() / 1000;
  await openCeremony(page, ceremony.ceremonyUrl, "redirect");
  await signAndFinish(page);
  await events.next();

  expect([...hosts].filter((host) => !DOCUMENTED_HOSTS.includes(host)), "undocumented hosts").toEqual([]);
  expect(hosts).toContain("vault.signatureapi.com");

  // The document's page images come from the vault as signed URLs that expire an hour after they are issued.
  expect(vaultUrls.length).toBeGreaterThan(0);
  for (const url of vaultUrls) {
    const validFor = policyExpiry(url) - loadedAt;
    expect(validFor).toBeGreaterThan(3_600 - 120);
    expect(validFor).toBeLessThanOrEqual(3_600 + 5);
  }
});
