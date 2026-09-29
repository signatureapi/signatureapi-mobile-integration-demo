import { expect, test } from "@playwright/test";
import {
  CEREMONY_ORIGIN,
  EventRecorder,
  acceptConsent,
  cancelFromToolbar,
  openCeremony,
  openTopLevelWithMessages,
  signAndFinish,
} from "../support/ceremony.ts";
import { envelopeSummary, replaceCeremony, signerStatus, startCeremony } from "../support/demo-server.ts";

// The recommended native pattern: load the ceremony as the WebView's top-level
// page with event_delivery=redirect, and intercept signatureapi-message:// URLs.

test.describe("top-level WebView with event_delivery=redirect", () => {
  test("completes, emits ceremony.completed, and the server confirms it", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attach(page, "redirect");

    await openCeremony(page, ceremony.ceremonyUrl, "redirect");
    await signAndFinish(page);

    expect(await events.next()).toMatchObject({ type: "ceremony.completed" });
    await expect.poll(() => signerStatus(request, ceremony.envelopeId), { timeout: 30_000 }).toBe("completed");
  });

  test("honours redirect_delay before emitting the event", async ({ page, request }) => {
    const ceremony = await startCeremony(request, { redirectDelay: 3 });
    const events = await EventRecorder.attach(page, "redirect");

    await openCeremony(page, ceremony.ceremonyUrl, "redirect");
    await signAndFinish(page);
    await expect(page.getByRole("heading", { name: "You signed this document" })).toBeVisible();
    const shownAt = Date.now();

    expect(await events.next()).toMatchObject({ type: "ceremony.completed" });
    expect(Date.now() - shownAt).toBeGreaterThanOrEqual(2_000);
  });

  test("cancelling emits ceremony.canceled and leaves the envelope open", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attach(page, "redirect");

    await openCeremony(page, ceremony.ceremonyUrl, "redirect");
    await acceptConsent(page);
    await cancelFromToolbar(page);

    expect(await events.next()).toMatchObject({ type: "ceremony.canceled" });
    expect((await envelopeSummary(request, ceremony.envelopeId)).status).toBe("in_progress");
  });

  test("a replaced link fails with error_type=unauthorized", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    await replaceCeremony(request, ceremony.recipientId);
    const events = await EventRecorder.attach(page, "redirect");

    await openCeremony(page, ceremony.ceremonyUrl, "redirect");

    expect(await events.next()).toMatchObject({ type: "ceremony.failed", error_type: "unauthorized" });
  });

  test("reopening a completed ceremony fails with error_type=already_completed", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const first = await EventRecorder.attach(page, "redirect");
    await openCeremony(page, ceremony.ceremonyUrl, "redirect");
    await signAndFinish(page);
    await first.next();

    const reopened = await page.context().newPage();
    const events = await EventRecorder.attach(reopened, "redirect");
    await openCeremony(reopened, ceremony.ceremonyUrl, "redirect");

    expect(await events.next()).toMatchObject({ type: "ceremony.failed", error_type: "already_completed" });
  });

  test("allow_cancel=false removes every cancel control", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    await openCeremony(page, ceremony.ceremonyUrl, "redirect", { allow_cancel: "false" });

    await expect(page.getByRole("button", { name: "Agree and Continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    await acceptConsent(page);
    await expect(page.getByRole("button", { name: "Finish" }).or(page.getByRole("button", { name: "Start" }))).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel signing" })).toHaveCount(0);
  });

  test("keeps typed input when the device rotates mid-ceremony", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attach(page, "redirect");
    await openCeremony(page, ceremony.ceremonyUrl, "redirect");
    await acceptConsent(page);

    // The typed-signature box is the ceremony's keyboard input on this document.
    await page.getByRole("button", { name: "Sign here" }).click();
    const dialog = page.getByRole("dialog", { name: "Please provide your signature" });
    const typed = dialog.getByRole("textbox", { name: "Typed signature" });
    await typed.fill("Rotation Check");

    const portrait = page.viewportSize()!;
    await page.setViewportSize({ width: portrait.height, height: portrait.width });
    await expect(typed).toHaveValue("Rotation Check");
    await page.setViewportSize(portrait);
    await expect(typed).toHaveValue("Rotation Check");

    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Adopt and Sign" }).click();
    await page.getByRole("button", { name: "Finish" }).click();
    expect(await events.next()).toMatchObject({ type: "ceremony.completed" });
  });

  test("renders in the envelope's language", async ({ page, request }) => {
    const ceremony = await startCeremony(request, { language: "es" });
    await openCeremony(page, ceremony.ceremonyUrl, "redirect");

    await expect(page.locator("html")).toHaveAttribute("lang", /^es/);
    await expect(page.getByRole("button", { name: "Agree and Continue" })).toHaveCount(0);
  });
});

// The opt-in alternative: the same top-level page with event_delivery=message.
// Loaded top-level, the ceremony's parent is its own window, so it posts the
// event to itself. top-level-message-bridge.js, the document-start script the
// apps install, forwards it when the origin and source check passes.

test.describe("top-level WebView with event_delivery=message", () => {
  test("completes, forwards ceremony.completed, and the server confirms it", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attachTopLevelMessages(page);

    await openTopLevelWithMessages(page, ceremony.ceremonyUrl);
    await signAndFinish(page);

    expect(await events.next()).toEqual({ type: "ceremony.completed", via: "postMessage" });
    await expect.poll(() => signerStatus(request, ceremony.envelopeId), { timeout: 30_000 }).toBe("completed");
    expect(events.redirectNavigations).toEqual([]);
    expect(events.rejectedOrigins).toEqual([]);
  });

  test("cancelling forwards ceremony.canceled and leaves the envelope open", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attachTopLevelMessages(page);

    await openTopLevelWithMessages(page, ceremony.ceremonyUrl);
    await acceptConsent(page);
    await cancelFromToolbar(page);

    expect(await events.next()).toEqual({ type: "ceremony.canceled", via: "postMessage" });
    expect((await envelopeSummary(request, ceremony.envelopeId)).status).toBe("in_progress");
    expect(events.redirectNavigations).toEqual([]);
  });

  test("a replaced link forwards ceremony.failed with error_type=unauthorized", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    await replaceCeremony(request, ceremony.recipientId);
    const events = await EventRecorder.attachTopLevelMessages(page);

    await openTopLevelWithMessages(page, ceremony.ceremonyUrl);

    const event = await events.next();
    expect(event).toMatchObject({ type: "ceremony.failed", error_type: "unauthorized", via: "postMessage" });
    expect(typeof event.error_message).toBe("string");
    expect(events.redirectNavigations).toEqual([]);
  });

  test("rejects messages from any other window, even on the ceremony's origin", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attachTopLevelMessages(page);
    await openTopLevelWithMessages(page, ceremony.ceremonyUrl);
    await expect(page.getByRole("button", { name: "Agree and Continue" })).toBeVisible();

    // A same-origin child frame passes the origin check; only the source check stops it.
    await page.evaluate(() => {
      const frame = document.createElement("iframe");
      frame.name = "intruder";
      document.body.append(frame);
    });
    const intruder = page.frame({ name: "intruder" });
    expect(intruder).not.toBeNull();
    await intruder!.evaluate(() => parent.postMessage({ type: "ceremony.completed" }, "*"));

    await expect.poll(() => events.rejectedOrigins).toEqual([CEREMONY_ORIGIN]);
    expect(events.events).toEqual([]);
  });
});
