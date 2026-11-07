import { z } from "zod";
import { getToken } from "@clerk/nextjs";
import { apiErrorSchema } from "@/generated/contracts/health";

export type HttpErrorKind = "configuration" | "network" | "timeout" | "aborted" | "http" | "invalid-response";
export class HttpError extends Error {
  constructor(
    public readonly kind: HttpErrorKind,
    message: string,
    public readonly status?: number,
    public readonly requestId?: string,
    public readonly code?: string,
  ) { super(message); this.name = "HttpError"; }
}

export function isTransientError(error: unknown): boolean {
  return error instanceof HttpError && (
    error.kind === "network" || error.kind === "timeout" ||
    (error.kind === "http" && error.code !== "CONFIGURATION_ERROR" &&
      (error.status === 408 || error.status === 429 || (error.status !== undefined && error.status >= 500)))
  );
}

export type JsonRequestOptions = {
  auth?: "session";
  body?: unknown;
  method?: "DELETE" | "PATCH" | "POST";
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function requestJson<T>(url: string, schema: z.ZodType<T>, options: JsonRequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 8_000);
  try {
    const token = options.auth === "session" ? await getToken({ skipCache: true }) : undefined;
    const response = await fetch(url, {
      method: options.method,
      signal: controller.signal,
      credentials: options.auth === "session" ? "include" : "omit",
      cache: "no-store",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers: {
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const headerId = response.headers.get("x-request-id");
    const requestId = headerId && z.uuid().safeParse(headerId).success ? headerId : undefined;
    const body: unknown = await response.json().catch((error: unknown) => {
      if (controller.signal.aborted) throw error;
      return undefined;
    });
    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(body);
      throw new HttpError("http", parsed.success ? parsed.data.error.message : `The API returned HTTP ${response.status}.`, response.status,
        parsed.success ? parsed.data.error.requestId : requestId,
        parsed.success ? parsed.data.error.code : undefined);
    }
    const result = schema.safeParse(body);
    if (!result.success) throw new HttpError("invalid-response", "The API response did not match the expected contract.", response.status, requestId);
    return result.data;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (options.signal?.aborted) throw new HttpError("aborted", "The request was cancelled.");
    if (timedOut) throw new HttpError("timeout", "The request timed out.");
    throw new HttpError("network", "The API could not be reached. Check the server address and connection.");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export function getJson<T>(url: string, schema: z.ZodType<T>, options: Omit<JsonRequestOptions, "body" | "method"> = {}) {
  return requestJson(url, schema, options);
}
