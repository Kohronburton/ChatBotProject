import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = await readFile(resolve(root, "dist/index.html"), "utf8");
const css = await readFile(resolve(root, "dist/styles.css"), "utf8");
const js = await readFile(resolve(root, "dist/app.js"), "utf8");
const readme = await readFile(resolve(root, "README.md"), "utf8");

const checks = [];
function check(name, action) { action(); checks.push(name); }

check("concept disclosure", () => assert.match(html, /Independent concept demo based only on the public job description/i));
check("fictional data disclosure", () => assert.match(html, /fictional data/i));
check("simulation boundary", () => assert.match(html, /All systems simulated/i));
check("production boundary in README", () => assert.match(readme, /does not connect to WhatsApp, OpenAI/i));
check("guided demo", () => assert.match(html, /id="guidedDemoButton"/));
check("three conversations", () => assert.equal((html.match(/data-conversation=/g) || []).length, 3));
check("message composer", () => assert.match(html, /id="messageForm"/));
check("approval queue", () => assert.match(html, /id="approvalList"/));
check("event log", () => assert.match(html, /id="eventTableBody"/));
check("event search", () => assert.match(html, /id="eventSearch"/));
check("integration health", () => assert.match(html, /id="crmHealth"/));
check("failure control", () => assert.match(html, /id="failureButton"/));
check("retry control", () => assert.match(html, /id="retryButton"/));
check("audit export", () => assert.match(html, /id="exportButton"/));
check("structured event dialog", () => assert.match(html, /<dialog id="eventDialog"/));
check("refund scenario", () => assert.match(js, /Refund request/));
check("human request scenario", () => assert.match(js, /Human assistance/));
check("low confidence scenario", () => assert.match(js, /confidence: 68/));
check("money movement blocked", () => assert.match(js, /money_movement: "blocked"/));
check("idempotency evidence", () => assert.match(js, /idempotency_key/));
check("retry behavior", () => assert.match(js, /Retry succeeded once/));
check("safe text insertion", () => assert.match(js, /body\.textContent = escapeText\(text\)/));
check("input boundary", () => assert.match(html, /maxlength="240"/));
check("live regions", () => assert.ok((html.match(/aria-live="polite"/g) || []).length >= 2));
check("skip link", () => assert.match(html, /class="skip-link"/));
check("labeled controls", () => assert.ok((html.match(/aria-label=/g) || []).length >= 10));
check("reduced motion", () => assert.match(css, /prefers-reduced-motion/));
check("mobile breakpoint", () => assert.match(css, /@media\(max-width:620px\)/));
check("tablet breakpoint", () => assert.match(css, /@media\(max-width:900px\)/));
check("dark mode", () => assert.match(css, /body\.dark/));
check("local stylesheet", () => assert.match(html, /href="\.\/styles\.css"/));
check("local script", () => assert.match(html, /src="\.\/app\.js"/));
check("no inline click handlers", () => assert.doesNotMatch(html, /onclick=/i));

check("unique element ids", () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});

check("JavaScript selectors resolve", () => {
  const selectedIds = [...js.matchAll(/\$\("#([A-Za-z0-9_-]+)"\)/g)].map((match) => match[1]);
  const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const missing = [...new Set(selectedIds)].filter((id) => !htmlIds.has(id));
  assert.deepEqual(missing, []);
});

check("no likely API keys", () => {
  for (const source of [html, css, js, readme]) assert.doesNotMatch(source, /sk-[A-Za-z0-9_-]{12,}/);
});

check("no personal contact details", () => {
  for (const source of [html, css, js, readme]) assert.doesNotMatch(source, /burtonjamal76|kohron@|\+1[ .-]?\(?\d{3}\)?/i);
});

await access(resolve(root, "dist/styles.css"));
await access(resolve(root, "dist/app.js"));
checks.push("required assets exist");
console.log(`${checks.length} demo checks passed`);
