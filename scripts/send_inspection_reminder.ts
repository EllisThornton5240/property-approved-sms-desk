import { dispatchSchema, prepareApprovedMessage } from "../src/approved_message_catalog.js";
import { infrai } from "../src/infrai_sms.js";

const input = dispatchSchema.parse({
  phone: process.env.TENANT_PHONE,
  signatureId: "resident-care",
  notification: {
    kind: "inspection_reminder",
    inspectionId: "INS-2048",
    tenantName: "Avery",
    propertyName: "Harbor Point",
    startsAt: "2026-10-08 09:30",
  },
});

const prepared = prepareApprovedMessage(input);
const result = await infrai.sms.batch.send(
  [prepared.message],
  prepared.idempotencyKey,
);
console.log(JSON.stringify({ accepted: true, result }, null, 2));
