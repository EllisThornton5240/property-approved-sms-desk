import assert from "node:assert/strict";
import test from "node:test";
import {
  ApprovalError,
  dispatchSchema,
  prepareApprovedMessage,
} from "../src/approved_message_catalog.js";

function inspectionWith(signatureId: "resident-care" | "leasing-desk") {
  return {
    phone: "+14155550123",
    signatureId,
    notification: {
      kind: "inspection_reminder" as const,
      inspectionId: "INS-2048",
      tenantName: "Avery",
      propertyName: "Harbor Point",
      startsAt: "2026-10-08 09:30",
    },
  };
}

test("an approved inspection reminder becomes a signed, stable batch item", () => {
  const input = dispatchSchema.parse(inspectionWith("resident-care"));
  const prepared = prepareApprovedMessage(input);

  assert.deepEqual(prepared, {
    message: {
      to: "+14155550123",
      text: "Hi Avery, inspection INS-2048 at Harbor Point starts 2026-10-08 09:30. Please confirm access. - Resident Care",
    },
    idempotencyKey: "property:inspection_reminder:INS-2048:+14155550123",
  });
});

test("an unapproved signature cannot enter the send batch", () => {
  const input = dispatchSchema.parse(inspectionWith("leasing-desk"));
  assert.throws(() => prepareApprovedMessage(input), ApprovalError);
});
