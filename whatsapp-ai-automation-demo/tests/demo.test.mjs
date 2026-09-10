import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../dist/index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../dist/styles.css", import.meta.url), "utf8");
const js = await readFile(new URL("../dist/app.js", import.meta.url), "utf8");

assert.match(html, /Independent concept demo/i, "disclosure must be visible");
assert.match(html, /No live WhatsApp, OpenAI, or CRM connection/i, "mock boundaries must be explicit");
assert.match(html, /id="messageForm"/, "interactive message form is required");
assert.match(html, /id="failureButton"/, "failure simulation is required");
assert.match(html, /Human approval/, "human approval control is required");
assert.match(html, /aria-live="polite"/, "dynamic updates need an accessible live region");
assert.match(css, /@media \(max-width: 700px\)/, "mobile layout is required");
assert.match(css, /prefers-reduced-motion/, "reduced motion support is required");
assert.match(js, /Refund request/, "refund scenario is required");
assert.match(js, /Retry queued/, "retry behavior is required");
assert.match(js, /textContent = text/, "chat content must be inserted as text, not HTML");

for (const source of [html, css, js]) {
  assert.ok(!/sk-[A-Za-z0-9_-]{10,}/.test(source), "no API keys may be committed");
}

console.log("11 demo checks passed");
