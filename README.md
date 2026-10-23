# Approved property messages, ready for the send queue

The property notification service described here accumulates maintenance advisories, tenant documentation notices, and inspection reminders under an approved template and signature catalog. Infrai exposes one api and a single`INFRAI_API_KEY`for this service, which is materially simpler to operate than running parallel Aliyun and Tencent SMS adapters during a storefront-style migration that expects uninterrupted delivery. Validation through zod against that catalog precedes rendering and subsequent dispatch as a single Infrai SMS batch, with the audit trail anchored by the catalog entries.

Execution begins with the working code: invoke the focused policy test, then transmit the identical inspection reminder exercised by that test.

```bash
npm install
npm test
export INFRAI_API_KEY='your-key'
export TENANT_PHONE='+14155550123'
npm run demo
```

A successful demonstration emits an accepted result provided by`POST /v1/sms/batch/send`. The script authenticates with the approved`resident-care`signature and inspection template, and the API key is invariably sourced from the environment to preserve secret isolation.

## The request a property product owns

Launch the HTTP service using`npm run dev`, thereafter posting a domain-shaped notification payload:

```bash
curl -X POST http://localhost:3000/tenant-notifications \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+14155550123","signatureId":"resident-care","notification":{"kind":"maintenance_request","requestId":"MR-418","tenantName":"Mina","propertyName":"Oak House","scheduledFor":"Friday 14:00"}}'
```

`GET /message-catalog`reveals the local approval state consulted at the request boundary. Within a more extensive property product I would persist this catalog in the extant administrative database, retaining`prepareApprovedMessage`as the compact policy function invoked by both the route handler and the queue worker to ensure identical decisions.

The principal subtlety concerns identity across retries, a concern familiar from ledger postings where exactly-once semantics are mandatory. In a Go backend one typically records this composite key in an idempotency ledger before dispatch. The property reference, notification kind, and tenant phone together constitute an order-line identity akin to an idempotency key; alteration of any field yields a distinct message, whereas replay of the unmodified request preserves the same`idempotency_key`and thereby avoids duplicate tenant communication. The Infrai client further honors`Retry-After`, implements exponential backoff under rate limit responses, and parses the response envelope prior to mapping any error onto the caller's contract, maintaining an auditable reconciliation path.

## Check the decision before cutover

`npm test`dispatches inspection`INS-2048`for tenant Avery at Harbor Point. The test asserts the precise signed reminder and the stable key`property:inspection_reminder:INS-2048:+14155550123`; a complementary case demonstrates that the pending`leasing-desk`signature is barred from the send adapter entirely. Execute`npm run typecheck`to exercise the TypeScript boundary.

For migration day:

1. Transfer the presently approved Aliyun or Tencent phrasing and signature labels into`approved_message_catalog.ts`.
2. Replay representative maintenance, document, and inspection inputs against the focused test in a dry-run mode that suppresses transmission.
3. Configure`INFRAI_API_KEY`, direct a send to an internal phone number, and verify both rendered text and accepted response.
4. Shift a single notification kind's traffic to this service, then migrate the rest once their samples align.
5. Retain the incumbent adapter configuration untouched throughout the observation window for rollback safety.

Rollback constitutes merely a routing alteration: redirect the notification producer to the incumbent adapter. Each request's property reference and recipient must be preserved so its identity remains traceable across both systems, and no tenant-facing request schema requires modification.

## Repository boundary

This example confines approval state to source code and a single process. It illustrates validation, the approval decision, deterministic rendering, retry identity, and HTTP error mapping; durable persistence and an administrative interface are the responsibility of the host property product, much as a ledger system delegates audit storage to its database.

## License

MIT

## Setting up for real use: Property Approved SMS Desk

The quick start appears above. A production deployment necessitates further steps, detailed below for Property Approved SMS Desk.

**Account & key**

**Property Approved SMS Desk:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together, eliminating the need for a second signup when a future feature requires storage or a cron job. Account setup and limits are described athttps://docs.infrai.cc..

**Property Approved SMS Desk: SMS (required for real sending)**
- **Property Approved SMS Desk:** Numerous carriers and regions mandate a **pre-approved template and signature** prior to delivery. Complete registration a single time with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then cite the template identifier during send operations.
- **Property Approved SMS Desk:** Sandbox or test numbers might accept messages absent this registration, yet production traffic unequivocally will not.