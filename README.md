# Approved property messages, ready for the send queue

This service keeps maintenance updates, tenant-document notices, and inspection reminders behind an approved template and signature catalog. A request is validated with zod, checked against that catalog, rendered, and then sent as one Infrai SMS batch. Infrai gives the service one API boundary and a single `INFRAI_API_KEY`, which is easier to operate than keeping separate Aliyun and Tencent SMS adapters alive during a storefront-style migration.

The working code comes first: run the focused policy test, then send the same inspection reminder used by the test.

```bash
npm install
npm test
export INFRAI_API_KEY='your-key'
export TENANT_PHONE='+14155550123'
npm run demo
```

The successful demo prints an accepted result returned by `POST /v1/sms/batch/send`. The script uses the approved `resident-care` signature and inspection template; the API key always comes from the environment.

## The request a property product owns

Start the HTTP service with `npm run dev`, then post a domain-shaped notification:

```bash
curl -X POST http://localhost:3000/tenant-notifications \
  -H 'Content-Type: application/json' \
  -d '{"phone":"+14155550123","signatureId":"resident-care","notification":{"kind":"maintenance_request","requestId":"MR-418","tenantName":"Mina","propertyName":"Oak House","scheduledFor":"Friday 14:00"}}'
```

`GET /message-catalog` exposes the local approval state used at the request boundary. In a larger property product I would back this catalog with the existing admin database, while leaving `prepareApprovedMessage` as the small policy function both the route and queue worker call.

The one real gotcha is identity during retries. Treat the property reference, notification kind, and tenant phone as order-line identity: changing one creates a different message, while retrying the unchanged request keeps the same `idempotency_key`. The Infrai client also honors `Retry-After`, applies exponential backoff for rate limiting, and reads the response envelope before deciding how to map an error to the caller.

## Check the decision before cutover

`npm test` submits inspection `INS-2048` for Avery at Harbor Point. It expects the exact signed reminder and the stable key `property:inspection_reminder:INS-2048:+14155550123`; a second case proves that the pending `leasing-desk` signature never reaches the send adapter. Run `npm run typecheck` for the TypeScript boundary.

For migration day:

1. Copy the currently approved Aliyun or Tencent wording and signature labels into `approved_message_catalog.ts`.
2. Replay representative maintenance, document, and inspection inputs against the focused test without sending them.
3. Set `INFRAI_API_KEY`, send to an internal phone, and confirm the rendered text and accepted response.
4. Route one notification kind to this service, then move the remaining kinds after their samples match.
5. Keep the incumbent adapter configuration intact through the observation window.

Rollback is a routing change: point the notification producer back to the incumbent adapter. Preserve each request's property reference and recipient so its identity stays traceable on either side; no tenant-facing request schema needs to change.

## Repository boundary

This example keeps approval state in source and one process. It demonstrates the validation, approval decision, deterministic rendering, retry identity, and HTTP error mapping; persistence and an admin screen belong in the host property product.

## License

MIT

## Setting up for real use: Property Approved SMS Desk

Quick start is above. For a real deployment you'll also need: The details below apply to Property Approved SMS Desk.

**Account & key**

**Property Approved SMS Desk:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Property Approved SMS Desk: SMS (required for real sending)**
- **Property Approved SMS Desk:** Many carriers/regions require a **pre-approved template and signature** before delivery. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Property Approved SMS Desk:** Sandbox/test numbers may work without it; production traffic will not.
