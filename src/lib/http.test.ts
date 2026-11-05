import { afterEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw";
import { healthResponseSchema } from "@/generated/contracts/health";
import { server } from "@/test/server";
import { getJson, HttpError, isTransientError } from "./http";

const url = "http://localhost:3001/api/v1/health";
const health = { status: "ok", service: "agentic-chat-api", contractVersion: "1.0.0" };
const id = "fce86589-479e-4b33-8f2b-9bc9c9038f84";

afterEach(() => vi.unstubAllGlobals());

describe("typed HTTP transport", () => {
  it.each(["timeout", "aborted"] as const)("preserves %s while reading a response body", async (kind) => {
    const controller = new AbortController();
    vi.stubGlobal("fetch", vi.fn(async (_url, init: RequestInit) => new Response(new ReadableStream({
      start(stream) {
        init.signal?.addEventListener("abort", () => stream.error(new DOMException("Aborted", "AbortError")), { once: true });
      },
    }))));
    const promise = getJson(url, healthResponseSchema, { signal: controller.signal, timeoutMs: kind === "timeout" ? 10 : 1_000 });
    if (kind === "aborted") setTimeout(() => controller.abort(), 10);
    await expect(promise).rejects.toMatchObject({ kind });
  });
  it("validates a successful response and omits credentials", async () => {
    server.use(http.get(url, () => HttpResponse.json(health)));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await getJson(url, healthResponseSchema)).toEqual(health);
    expect(fetchSpy).toHaveBeenCalledWith(url, expect.objectContaining({ credentials: "omit" }));
    fetchSpy.mockRestore();
  });
  it.each([{}, { ...health, contractVersion: "2.0.0" }])("rejects malformed success bodies", async (body) => {
    server.use(http.get(url, () => HttpResponse.json(body)));
    await expect(getJson(url, healthResponseSchema)).rejects.toMatchObject({ kind: "invalid-response" });
  });
  it("rejects non-JSON success responses", async () => {
    server.use(http.get(url, () => new HttpResponse("not JSON")));
    await expect(getJson(url, healthResponseSchema)).rejects.toMatchObject({ kind: "invalid-response" });
  });
  it("normalizes network failures", async () => {
    server.use(http.get(url, () => HttpResponse.error()));
    await expect(getJson(url, healthResponseSchema)).rejects.toMatchObject({ kind: "network" });
  });
  it("handles HTTP status before success schema and keeps a validated request ID", async () => {
    server.use(http.get(url, () => HttpResponse.json({ error: { code: "ORIGIN_NOT_ALLOWED", message: "Denied", requestId: id } }, { status: 403 })));
    await expect(getJson(url, healthResponseSchema)).rejects.toMatchObject({ kind: "http", status: 403, code: "ORIGIN_NOT_ALLOWED", requestId: id });
  });
  it("normalizes non-JSON errors without displaying raw content", async () => {
    server.use(http.get(url, () => new HttpResponse("private details", { status: 503, headers: { "x-request-id": id } })));
    await expect(getJson(url, healthResponseSchema)).rejects.toMatchObject({ kind: "http", status: 503, message: "The API returned HTTP 503.", requestId: id });
  });
  it("bounds requests with a timeout", async () => {
    server.use(http.get(url, async () => { await delay(100); return HttpResponse.json(health); }));
    await expect(getJson(url, healthResponseSchema, { timeoutMs: 10 })).rejects.toMatchObject({ kind: "timeout" });
  });
  it("respects cancellation and does not retry it", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(getJson(url, healthResponseSchema, { signal: controller.signal })).rejects.toMatchObject({ kind: "aborted" });
    expect(isTransientError(new HttpError("aborted", "cancelled"))).toBe(false);
  });
  it("retries only transient errors", () => {
    expect(isTransientError(new HttpError("http", "error", 503))).toBe(true);
    expect(isTransientError(new HttpError("http", "error", 403))).toBe(false);
    expect(isTransientError(new HttpError("invalid-response", "error"))).toBe(false);
    expect(isTransientError(new HttpError("configuration", "error"))).toBe(false);
    expect(isTransientError(new HttpError("http", "error", 500, id, "CONFIGURATION_ERROR"))).toBe(false);
  });
});
