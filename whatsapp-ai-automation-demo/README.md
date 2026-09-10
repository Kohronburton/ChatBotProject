# RelayDesk — WhatsApp AI Automation Concept

RelayDesk is an interactive portfolio demo built from a public Upwork job description. It shows how an operator could manage AI-assisted WhatsApp conversations, approvals, CRM actions, audit records, and provider failures from one clear workspace.

> **Independent concept demo.** All customers, messages, metrics, events, and business details are fictional. The project is not affiliated with the client and does not connect to WhatsApp, OpenAI, Zapier, a payment processor, or a real CRM.

## Live value path

1. A WhatsApp-style customer message enters the inbox.
2. The local demo classifies its intent and extracts useful details.
3. Business rules decide whether automation may continue.
4. Money requests, direct human requests, and unclear information pause for review.
5. An approved action updates the visible workflow and audit history.
6. A simulated CRM outage preserves the action in a retry queue.
7. Retrying completes the write once and shows that no duplicate was created.

## What to try

- Select Maya, Jordan, or Amina to compare booking, refund, and unclear-date cases.
- Use the test-scenario buttons or type your own message.
- Approve a reply, edit it, or hand the conversation to a person.
- Resolve items in the approval queue.
- Search and filter the event log, inspect a structured audit event, or export the fictional log.
- Simulate a CRM failure and run the safe retry.
- Run the guided demo for a short, client-friendly walkthrough.
- Switch to dark mode or resize to a phone-width layout.

## Product safeguards represented

- Human approval for money, complaints, and low-confidence decisions
- Explicit policy reasons instead of a hidden yes/no decision
- Structured intent and field extraction
- Repeat-safe CRM operations using idempotency keys
- Webhook verification as the first workflow step
- Retry queue with backoff and an operator-visible failure state
- Full action history for review and debugging
- User text inserted with `textContent`, never executable HTML
- No API keys, secrets, personal contact details, or real customer data

## Architecture for a production build

```text
WhatsApp Cloud API → verified webhook → durable event store
    → intent + structured fields → policy checkpoint
    → human approval when required
    → CRM / scheduling adapter → retry queue → audit + monitoring
```

A production version would add authenticated staff access, encrypted provider credentials, rate limiting, privacy and retention rules, real database persistence, monitoring, client-specific policies, verified WhatsApp templates, and end-to-end provider testing.

## Run locally

This is a dependency-free static demo:

```bash
python3 -m http.server 8000 --directory dist
```

Then open `http://localhost:8000`.

## Validation

```bash
node --check dist/app.js
node tests/demo.test.mjs
```

The checks cover disclosure language, core controls, scenario depth, safety behavior, accessibility hooks, responsive layout, asset references, and accidental secret exposure.
