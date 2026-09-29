import { expect, test, type Page } from "@playwright/test";
import { EventRecorder, openCeremony } from "../support/ceremony.ts";
import { signerStatus, startCeremony } from "../support/demo-server.ts";

// The ceremony arms completion only after it has seen input a person produces,
// so an email link scanner can't complete it. These tests pin down what counts,
// and explain why the rest of the suite completes with plain Playwright clicks:
// signAndFinish clicks several controls, and every click first moves the mouse
// to that control, so the ceremony sees the pointer at several positions.

/** Reaches Finish with DOM-dispatched clicks only: no pointer movement, wheel, touch or keys. */
async function reachFinishWithoutInput(page: Page) {
  await page.getByRole("dialog", { name: "Consent to continue" }).getByRole("checkbox").dispatchEvent("click");
  await page.getByRole("button", { name: "Agree and Continue" }).dispatchEvent("click");
  await page.getByRole("button", { name: "Sign here" }).dispatchEvent("click");
  const dialog = page.getByRole("dialog", { name: "Please provide your signature" });
  await dialog.getByRole("checkbox").dispatchEvent("click");
  await dialog.getByRole("button", { name: "Adopt and Sign" }).dispatchEvent("click");
  await expect(page.getByRole("button", { name: "Finish" })).toBeVisible();
}

test.describe("organic-input gate", () => {
  test("a single click at Finish, after scrolling, asks for confirmation instead of completing", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attach(page, "redirect");
    await openCeremony(page, ceremony.ceremonyUrl, "redirect");
    await reachFinishWithoutInput(page);

    // Scrolling the page is not input a person produced.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.getByRole("button", { name: "Finish" }).click();

    await expect(page.getByRole("dialog", { name: "Confirm to continue" })).toBeVisible();
    await page.waitForTimeout(3_000);
    expect(events.redirectNavigations).toEqual([]);
    expect(await signerStatus(request, ceremony.envelopeId)).not.toBe("completed");
  });

  test("three pointer positions are not enough", async ({ page, request }) => {
    const ceremony = await startCeremony(request);
    const events = await EventRecorder.attach(page, "redirect");
    await openCeremony(page, ceremony.ceremonyUrl, "redirect");
    await reachFinishWithoutInput(page);

    // Two moves plus the click's own position: three cells of the 16px grid.
    for (const [x, y] of [[40, 200], [120, 260]] as const) await page.mouse.move(x, y);
    await page.getByRole("button", { name: "Finish" }).click();

    await expect(page.getByRole("dialog", { name: "Confirm to continue" })).toBeVisible();
    expect(events.redirectNavigations).toEqual([]);
  });

  const organicInputs: Record<string, (page: Page) => Promise<void>> = {
    "the pointer at several positions": async (page) => {
      for (const [x, y] of [[40, 200], [120, 260], [200, 320], [280, 380]] as const) await page.mouse.move(x, y);
      await page.getByRole("button", { name: "Finish" }).click();
    },
    "a key press": async (page) => {
      await page.keyboard.press("Shift");
      await page.getByRole("button", { name: "Finish" }).click();
    },
    "a scroll wheel": async (page) => {
      await page.mouse.wheel(0, 40);
      await page.getByRole("button", { name: "Finish" }).click();
    },
    "a tap": async (page) => {
      await page.getByRole("button", { name: "Finish" }).tap();
    },
  };

  for (const [name, input] of Object.entries(organicInputs)) {
    test(`${name} arms completion`, async ({ page, request, browserName }) => {
      test.skip(name === "a scroll wheel" && browserName === "webkit", "Playwright has no wheel input in mobile WebKit");
      const ceremony = await startCeremony(request);
      const events = await EventRecorder.attach(page, "redirect");
      await openCeremony(page, ceremony.ceremonyUrl, "redirect");
      await reachFinishWithoutInput(page);

      await input(page);

      expect(await events.next()).toMatchObject({ type: "ceremony.completed" });
      await expect(page.getByRole("dialog", { name: "Confirm to continue" })).toHaveCount(0);
    });
  }
});
