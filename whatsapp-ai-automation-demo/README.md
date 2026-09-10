# RelayDesk — WhatsApp AI Automation Concept Demo

An independent, interactive concept built from a public Upwork job description. It demonstrates how a WhatsApp message could move through intent detection, a controlled AI reply, human approval, a CRM update, and a follow-up workflow.

> This is a portfolio simulation using fictional data. It is not affiliated with the client and does not connect to WhatsApp, OpenAI, Zapier, or a live CRM.

## What the demo proves

- A customer message is classified into a clear intent.
- Sensitive requests such as refunds pause for human review.
- Approved replies update a visible audit trail.
- CRM failures move work into a retry queue instead of losing or duplicating it.
- The layout works on desktop and mobile and supports keyboard navigation and reduced motion.

## Try it

Open `dist/index.html`, then:

1. Choose an example message or type your own.
2. Send it to see the agent decision and proposed reply.
3. Approve the reply to complete the simulated workflow.
4. Select **Simulate failure** to see the fallback and retry path.

## Architecture represented

1. WhatsApp webhook verification
2. Structured intent classification
3. Policy and confidence guardrails
4. Human approval for sensitive actions
5. Repeat-safe CRM writes
6. Retry queue and human alert after repeated failure

## Local checks

```bash
node --check dist/app.js
node tests/demo.test.mjs
```

## Scope boundaries

This front-end demo intentionally uses deterministic local logic. A production build would add verified WhatsApp Cloud API webhooks, secure secret management, a hosted database, authenticated staff access, real CRM adapters, provider rate limits, monitoring, and privacy/retention controls.
