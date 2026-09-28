// End-to-end: runs the real server as a child process against SignatureAPI
// test mode, then checks the behaviour the mobile apps and the written answers
// rely on. Needs SIGNATUREAPI_KEY (a key_test_ key) in the environment or .env.

import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { after, before, describe, it } from "node:test";

const EMBED_ORIGIN = "https://app.demo.invalid";
const SERVER_DIR = new URL("..", import.meta.url);

const hasKey = Boolean(process.env.SIGNATUREAPI_KEY) || existsSync(new URL(".env", SERVER_DIR));
const skip = hasKey ? false : "set SIGNATUREAPI_KEY or create server/.env to run the e2e suite";

interface Started {
  envelopeId: string;
  recipientId: string;
  ceremonyUrl: string;
}

describe("demo server against SignatureAPI test mode", { skip, timeout: 120_000 }, () => {
  let child: ChildProcess;
  let base: string;
  let output = "";

  before(async () => {
    child = spawn(process.execPath, ["--env-file-if-exists=.env", "src/index.ts"], {
      cwd: SERVER_DIR,
      env: { ...process.env, PORT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stderr?.on("data", (chunk: Buffer) => (output += chunk.toString()));
    base = await new Promise<string>((resolve, reject) => {
      child.once("exit", (code) => reject(new Error(`server exited early (${code}):\n${output}`)));
      child.stdout?.on("data", (chunk: Buffer) => {
        output += chunk.toString();
        const port = /listening on http:\/\/0\.0\.0\.0:(\d+)/.exec(output)?.[1];
        if (port) resolve(`http://127.0.0.1:${port}`);
      });
    });
  });

  after(() => {
    child?.kill();
  });

  const post = async (path: string, body: unknown) =>
    fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const embedded = (ceremonyUrl: string, delivery: "redirect" | "message") => {
    const url = new URL(ceremonyUrl);
    url.searchParams.set("embedded", "true");
    url.searchParams.set("event_delivery", delivery);
    return url;
  };

  const frameAncestors = async (url: URL) => {
    const res = await fetch(url, { redirect: "follow" });
    assert.equal(res.status, 200, `ceremony page returned ${res.status}`);
    return /frame-ancestors ([^;]+)/.exec(res.headers.get("content-security-policy") ?? "")?.[1]?.trim();
  };

  let topLevel: Started;
  let framed: Started;

  it("issues a custom-auth ceremony URL for top-level WebView loading", async () => {
    const res = await post("/ceremonies", { language: "en" });
    assert.equal(res.status, 201, await res.clone().text());
    topLevel = (await res.json()) as Started;
    assert.equal(new URL(topLevel.ceremonyUrl).origin, "https://sign.signatureapi.com");
    assert.match(topLevel.recipientId, /^re_/);
  });

  it("loads the ceremony top-level and forbids framing when no embed origin is set", async () => {
    const ancestors = await frameAncestors(embedded(topLevel.ceremonyUrl, "redirect"));
    // SignatureAPI currently sends the bare word `none`, which browsers parse as a
    // hostname nobody has, so framing is still refused. Accept it and the proper keyword.
    assert.ok(ancestors === "'none'" || ancestors === "none", `unexpected frame-ancestors: ${ancestors}`);
  });

  it("allows framing only from the requested origin", async () => {
    const res = await post("/ceremonies", { embedOrigin: EMBED_ORIGIN, language: "es" });
    assert.equal(res.status, 201, await res.clone().text());
    framed = (await res.json()) as Started;
    assert.match(new URL(framed.ceremonyUrl).pathname, /^\/es\//);

    const ancestors = await frameAncestors(embedded(framed.ceremonyUrl, "message"));
    assert.equal(ancestors, EMBED_ORIGIN);
  });

  it("resumes the same ceremony from the server, so the app never stores the URL", async () => {
    const res = await fetch(`${base}/envelopes/${topLevel.envelopeId}/ceremony-url`);
    assert.equal(res.status, 200);
    const current = (await res.json()) as { ceremonyUrl: string; envelopeStatus: string };
    assert.equal(current.envelopeStatus, "in_progress");
    // The token is re-issued on every read, so the URL differs but still opens.
    assert.equal(await frameAncestors(embedded(current.ceremonyUrl, "redirect")), "none");
  });

  it("replaces the ceremony and keeps the embed origin of the new one", async () => {
    const res = await post(`/recipients/${framed.recipientId}/ceremony`, { embedOrigin: EMBED_ORIGIN });
    assert.equal(res.status, 201);
    const replaced = (await res.json()) as { ceremonyUrl: string };
    assert.equal(await frameAncestors(embedded(replaced.ceremonyUrl, "message")), EMBED_ORIGIN);
    // Whether the previous URL is refused is only visible once the ceremony app runs:
    // the page itself still loads with 200. The browser suite covers that case.
  });

  it("reports envelope status from the server side", async () => {
    const res = await fetch(`${base}/envelopes/${framed.envelopeId}`);
    const summary = (await res.json()) as { status: string; recipients: Array<{ key: string; status: string }> };
    assert.equal(summary.status, "in_progress");
    const signer = summary.recipients.find((r) => r.key === "signer");
    assert.ok(signer, "summary has no signer");
    assert.notEqual(signer.status, "completed");
  });

  it("rejects bad input before calling SignatureAPI", async () => {
    assert.equal((await post("/ceremonies", { embedOrigin: "http://app.demo.invalid" })).status, 400);
    assert.equal((await post("/ceremonies", { language: "xx" })).status, 400);
    assert.equal((await fetch(`${base}/envelopes/not-a-uuid`)).status, 400);
    assert.equal((await post("/recipients/nope/ceremony", {})).status, 400);
  });

  it("never writes a ceremony URL to its logs", () => {
    assert.ok(output.includes("ready"), "expected the server to log envelope creation");
    assert.ok(!output.includes("token="), "server output contains a ceremony token");
  });
});
