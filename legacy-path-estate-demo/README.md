# LegacyPath estate-planning concept demo

An independent, fictional concept built from a public project description. It demonstrates a guided will interview, conditional questions, review, simulated payment, browser-generated PDF and a bounded support assistant.

## Run

Open `dist/index.html` in a modern browser. No dependencies or secrets are required.

## What works

- Responsive marketing experience
- Five-step will questionnaire with validation
- Conditional spouse and child questions
- Device-local draft saving
- Plain-English review and editing
- Simulated checkout with no real payment details
- Downloadable sample PDF generated in the browser
- Grounded, rule-based support assistant with legal limits
- Keyboard, focus and reduced-motion accessibility basics
- Optional WebMCP tools for starting and inspecting the demo

## Honest boundaries

This is not legal advice, a legal service, or a production will system. It uses fictional information. It does not connect to a payment provider, store data on a server, authenticate users, or create a legally valid document. A production build would require jurisdiction-specific counsel-approved templates, encryption, authentication, audit history, retention rules, payment webhooks, monitoring and formal security review.

## Verification

Run `node tests/demo.test.mjs` and `node --check dist/app.js`.
