import { expect, test } from "@playwright/test";
import { EMBED_ORIGIN, EventRecorder, openCeremony, signAndFinish } from "../support/ceremony.ts";
import { replaceCeremony, signerStatus, startCeremony } from "../support/demo-server.ts";

// The web-SDK pattern moved into a WebView: a local page, served from a
// synthetic https origin, iframes the ceremony with event_delivery=message.

test.describe("local host page + iframe with event_delivery=message", () => {
  test("frames from the synthetic origin and completes via postMessage", async ({ page, request }) => {
    const ceremony = await startCeremony(request, { embedOrigin: EMBED_ORIGIN });
    const events = await EventRecorder.attach(page, "message");

    const frame = await openCeremony(page, ceremony.ceremonyUrl, "message");
    await signAndFinish(frame);

    expect(await events.next()).toEqual({ type: "ceremony.completed", via: "postMessage" });
    await expect.poll(() => signerStatus(request, ceremony.envelopeId), { timeout: 30_000 }).toBe("completed");
  });

  test("ignores messages that do not come from the ceremony frame", async ({ page, request }) => {
    const ceremony = await startCeremony(request, { embedOrigin: EMBED_ORIGIN });
    const events = await EventRecorder.attach(page, "message");
    const frame = await openCeremony(page, ceremony.ceremonyUrl, "message");
    await expect(frame.getByRole("button", { name: "Agree and Continue" })).toBeVisible();

    // Anything else running in the host page could try to fake completion.
    await page.evaluate(() => window.postMessage({ type: "ceremony.completed" }, "*"));

    await expect.poll(() => events.rejectedOrigins).toEqual([EMBED_ORIGIN]);
    expect(events.events).toEqual([]);
  });

  test("is refused when the host origin is not in embeddable_in", async ({ page, request }) => {
    const ceremony = await startCeremony(request, { embedOrigin: null });
    const frame = await openCeremony(page, ceremony.ceremonyUrl, "message");

    await page.waitForTimeout(5_000);
    await expect(frame.getByRole("button", { name: "Agree and Continue" })).toHaveCount(0);
  });

  test("a replaced link fails with error_type=unauthorized over postMessage", async ({ page, request }) => {
    const ceremony = await startCeremony(request, { embedOrigin: EMBED_ORIGIN });
    await replaceCeremony(request, ceremony.recipientId, EMBED_ORIGIN);
    const events = await EventRecorder.attach(page, "message");

    await openCeremony(page, ceremony.ceremonyUrl, "message");

    const event = await events.next();
    expect(event).toMatchObject({ type: "ceremony.failed", error_type: "unauthorized", via: "postMessage" });
    expect(typeof event.error_message).toBe("string");
  });

});
