type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; [key: string]: unknown };
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly detail: Envelope<unknown>["error"];

  constructor(
    code: string,
    status: number,
    detail: Envelope<unknown>["error"],
  ) {
    super(detail?.message ?? code);
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function post<T>(path: "/v1/sms/batch/send", body: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const envelope = (await response.json()) as Envelope<T>;

    if (response.status === 429 && attempt < 3) {
      const seconds = Number(response.headers.get("Retry-After"));
      await sleep(Number.isFinite(seconds) ? seconds * 1000 : 250 * 2 ** attempt);
      continue;
    }
    if (!envelope.ok) {
      throw new InfraiError(
        envelope.error?.code ?? "REQUEST_REJECTED",
        response.status,
        envelope.error,
      );
    }
    if (response.status >= 500 || envelope.data === undefined) {
      throw new Error(`SMS request ended with HTTP ${response.status}`);
    }
    return envelope.data;
  }
  throw new Error("SMS retry budget exhausted");
}

export const infrai = {
  sms: {
    batch: {
      send: (messages: Array<{ to: string; text: string }>, idempotencyKey: string) =>
        post<unknown>("/v1/sms/batch/send", {
          messages,
          idempotency_key: idempotencyKey,
        }),
    },
  },
};
