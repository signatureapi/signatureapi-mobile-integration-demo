import { readFile } from "node:fs/promises";
import { expect, type FrameLocator, type Page } from "@playwright/test";

/** Synthetic https origin the local host page is served from. */
export const EMBED_ORIGIN = "https://app.demo.invalid";
export const CEREMONY_ORIGIN = "https://sign.signatureapi.com";

export type Delivery = "redirect" | "message";

export interface CeremonyEvent {
  type: string;
  error_type?: string;
  error_message?: string;
}

/**
 * Parses `signatureapi-message://<type>/?error_type=…&error_message=…`, the URL
 * the ceremony navigates to when event_delivery=redirect. Same rules as the apps.
 */
export function parseRedirectEvent(url: string): CeremonyEvent | null {
  const parsed = new URL(url);
  if (parsed.protocol !== "signatureapi-message:" || !parsed.host) return null;
  return { type: parsed.host, ...Object.fromEntries(parsed.searchParams) };
}

export function embeddedUrl(ceremonyUrl: string, delivery: Delivery, extra: Record<string, string> = {}): string {
  const url = new URL(ceremonyUrl);
  url.searchParams.set("embedded", "true");
  url.searchParams.set("event_delivery", delivery);
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
  return url.toString();
}

const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");

/** Renders embed-page.html for a ceremony URL. */
export async function renderEmbedPage(ceremonySrc: string): Promise<string> {
  const template = await readFile(new URL("./embed-page.html", import.meta.url), "utf8");
  return template
    .replace("{{CEREMONY_SRC}}", escapeAttribute(ceremonySrc))
    .replace("{{CEREMONY_ORIGIN_JSON}}", JSON.stringify(new URL(ceremonySrc).origin));
}

/**
 * Collects terminal ceremony events the way a native app receives them.
 *
 * - message: the host page forwards postMessage events through a bridge.
 * - redirect: the ceremony navigates to `signatureapi-message://…`. A desktop
 *   browser cannot open that scheme, but the Navigation API still fires a
 *   `navigate` event for it in both Chromium and WebKit, which is the same
 *   moment WKWebView's `decidePolicyFor` and Android's `shouldOverrideUrlLoading`
 *   see it. Do not use the ceremony's "Sending redirect message" log as
 *   evidence: an earlier ceremony release printed it without navigating.
 */
export class EventRecorder {
  readonly events: Array<CeremonyEvent & { via: string }> = [];
  readonly rejectedOrigins: string[] = [];

  static async attach(page: Page, delivery: Delivery): Promise<EventRecorder> {
    const recorder = new EventRecorder();
    if (delivery === "message") {
      await page.exposeBinding("__signatureapiTestBridge", (_source, raw: string) => {
        const { kind, payload } = JSON.parse(raw) as { kind: string; payload: CeremonyEvent & { origin?: string } };
        if (kind === "event") recorder.events.push({ ...payload, via: "postMessage" });
        else recorder.rejectedOrigins.push(payload.origin ?? "");
      });
      return recorder;
    }

    await page.exposeBinding("__signatureapiNavigation", (_source, url: string) => {
      const event = parseRedirectEvent(url);
      if (event) recorder.events.push({ ...event, via: "redirect" });
    });
    await page.addInitScript(() => {
      const navigation = (window as unknown as { navigation?: EventTarget }).navigation;
      navigation?.addEventListener("navigate", (event) => {
        const url = (event as unknown as { destination: { url: string } }).destination.url;
        if (url.startsWith("signatureapi-message:")) {
          (window as unknown as { __signatureapiNavigation: (url: string) => void }).__signatureapiNavigation(url);
        }
      });
    });
    return recorder;
  }

  async next(timeout = 30_000): Promise<CeremonyEvent & { via: string }> {
    await expect.poll(() => this.events.length, { timeout, message: "no terminal ceremony event" }).toBeGreaterThan(0);
    return this.events[0]!;
  }
}

/** Opens a ceremony top-level (redirect) or inside the shared host page (message). */
export async function openCeremony(page: Page, ceremonyUrl: string, delivery: Delivery, extra: Record<string, string> = {}) {
  const src = embeddedUrl(ceremonyUrl, delivery, extra);
  if (delivery === "redirect") {
    await page.goto(src);
    return page;
  }
  const html = await renderEmbedPage(src);
  await page.route(`${EMBED_ORIGIN}/**`, (route) => route.fulfill({ contentType: "text/html; charset=utf-8", body: html }));
  await page.goto(`${EMBED_ORIGIN}/`);
  return page.frameLocator("#ceremony");
}

type Root = Page | FrameLocator;

export async function acceptConsent(root: Root) {
  await root.getByRole("dialog", { name: "Consent to continue" }).getByRole("checkbox").check();
  await root.getByRole("button", { name: "Agree and Continue" }).click();
}

export async function adoptTypedSignature(root: Root) {
  await root.getByRole("button", { name: "Sign here" }).click();
  const dialog = root.getByRole("dialog", { name: "Please provide your signature" });
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Adopt and Sign" }).click();
}

export async function signAndFinish(root: Root) {
  await acceptConsent(root);
  await adoptTypedSignature(root);
  await root.getByRole("button", { name: "Finish" }).click();
}

export async function cancelFromToolbar(root: Root) {
  await root.getByRole("button", { name: "Cancel signing" }).click();
  await root.getByRole("dialog", { name: "Cancel signing" }).getByRole("button", { name: "Yes" }).click();
}
