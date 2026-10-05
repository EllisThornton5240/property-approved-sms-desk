import express from "express";
import { ZodError } from "zod";
import {
  ApprovalError,
  catalogView,
  dispatchSchema,
  prepareApprovedMessage,
} from "./approved_message_catalog.js";
import { InfraiError, infrai } from "./infrai_sms.js";

const service = express();
service.use(express.json());

service.get("/message-catalog", (_request, response) => {
  response.json(catalogView());
});

service.post("/tenant-notifications", async (request, response) => {
  try {
    const input = dispatchSchema.parse(request.body);
    const prepared = prepareApprovedMessage(input);
    const result = await infrai.sms.batch.send(
      [prepared.message],
      prepared.idempotencyKey,
    );
    response.status(202).json({ accepted: true, result });
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({ error: "invalid_request", issues: error.issues });
      return;
    }
    if (error instanceof ApprovalError) {
      response.status(409).json({ error: "approval_required" });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      response.status(status).json({ error: error.code, detail: error.detail });
      return;
    }
    response.status(500).json({ error: "service_error" });
  }
});

const port = Number(process.env.PORT ?? 3000);
service.listen(port, () => {
  console.log(`Property message service listening on http://localhost:${port}`);
});
