import { z } from "zod";

export const notificationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("maintenance_request"),
    requestId: z.string().min(1),
    tenantName: z.string().min(1),
    propertyName: z.string().min(1),
    scheduledFor: z.string().min(1),
  }),
  z.object({
    kind: z.literal("tenant_document"),
    documentName: z.string().min(1),
    tenantName: z.string().min(1),
    propertyName: z.string().min(1),
    reviewUrl: z.string().url(),
  }),
  z.object({
    kind: z.literal("inspection_reminder"),
    inspectionId: z.string().min(1),
    tenantName: z.string().min(1),
    propertyName: z.string().min(1),
    startsAt: z.string().min(1),
  }),
]);

export const dispatchSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
  signatureId: z.enum(["resident-care", "leasing-desk"]),
  notification: notificationSchema,
});

export type DispatchInput = z.infer<typeof dispatchSchema>;
export type Notification = z.infer<typeof notificationSchema>;

const signatures = {
  "resident-care": { label: "Resident Care", approved: true },
  "leasing-desk": { label: "Leasing Desk", approved: false },
} as const;

const templates = {
  maintenance_request: { approved: true },
  tenant_document: { approved: true },
  inspection_reminder: { approved: true },
} as const;

export class ApprovalError extends Error {}

export function catalogView() {
  return { templates, signatures };
}

export function prepareApprovedMessage(input: DispatchInput) {
  const signature = signatures[input.signatureId];
  const template = templates[input.notification.kind];
  if (!signature.approved || !template.approved) {
    throw new ApprovalError("Template and signature must both be approved");
  }

  const notice = input.notification;
  let text: string;
  let reference: string;
  if (notice.kind === "maintenance_request") {
    reference = notice.requestId;
    text = `Hi ${notice.tenantName}, maintenance request ${notice.requestId} at ${notice.propertyName} is scheduled for ${notice.scheduledFor}.`;
  } else if (notice.kind === "tenant_document") {
    reference = notice.documentName;
    text = `Hi ${notice.tenantName}, your ${notice.documentName} for ${notice.propertyName} is ready: ${notice.reviewUrl}`;
  } else {
    reference = notice.inspectionId;
    text = `Hi ${notice.tenantName}, inspection ${notice.inspectionId} at ${notice.propertyName} starts ${notice.startsAt}. Please confirm access.`;
  }

  return {
    message: { to: input.phone, text: `${text} - ${signature.label}` },
    idempotencyKey: `property:${notice.kind}:${reference}:${input.phone}`,
  };
}
