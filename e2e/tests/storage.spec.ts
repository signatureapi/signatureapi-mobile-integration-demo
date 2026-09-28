import { expect, test, type Frame, type Page } from "@playwright/test";
import { EMBED_ORIGIN, EventRecorder, acceptConsent, adoptTypedSignature, openCeremony, type Delivery } from "../support/ceremony.ts";
import { startCeremony } from "../support/demo-server.ts";

// WKWebView blocks third-party cookies and partitions storage; Android's
// WebView blocks third-party cookies and ships with DOM storage off. These
// tests pin down that the ceremony needs neither, top-level or framed.

interface Snapshot {
  cookies: string[];
  localStorage: string[];
  sessionStorage: string[];
}

async function snapshot(page: Page, frame: Frame): Promise<Snapshot> {
  const cookies = (await page.context().cookies()).map((c) => `${c.name}@${c.domain}`);
  const storage = await frame.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
  return { cookies, localStorage: storage.local, sessionStorage: storage.session };
}

const EMPTY: Snapshot = { cookies: [], localStorage: [], sessionStorage: [] };

for (const delivery of ["redirect", "message"] as const satisfies Delivery[]) {
  test(`needs no cookies or web storage (${delivery === "redirect" ? "top-level" : "iframe"})`, async ({ page, request }) => {
    const ceremony = await startCeremony(request, { embedOrigin: delivery === "message" ? EMBED_ORIGIN : null });
    const events = await EventRecorder.attach(page, delivery);

    const cookieHeaders: string[] = [];
    page.on("request", async (req) => {
      if (!req.url().startsWith("https://api.signatureapi.com/")) return;
      const headers = await req.allHeaders();
      if (headers.cookie) cookieHeaders.push(new URL(req.url()).pathname);
    });

    const root = await openCeremony(page, ceremony.ceremonyUrl, delivery);
    const ceremonyFrame = () => page.frames().find((f) => f.url().startsWith("https://sign.signatureapi.com/"))!;

    await acceptConsent(root);
    const during = await snapshot(page, ceremonyFrame());

    await adoptTypedSignature(root);
    await root.getByRole("button", { name: "Finish" }).click();
    await events.next();
    const after = await snapshot(page, ceremonyFrame());

    test.info().annotations.push({ type: "storage", description: JSON.stringify({ during, after }) });
    expect(during).toEqual(EMPTY);
    expect(after).toEqual(EMPTY);
    expect(cookieHeaders, "API requests that carried a Cookie header").toEqual([]);
  });
}
