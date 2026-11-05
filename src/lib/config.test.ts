import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "./config";

describe("public API configuration", () => {
  it("defaults only in development and accepts an explicit production origin", () => {
    expect(resolveApiBaseUrl(undefined, "development")).toBe("http://localhost:3001");
    expect(resolveApiBaseUrl("https://api.example.test/", "production")).toBe("https://api.example.test");
  });
  it("requires a production value", () => {
    expect(() => resolveApiBaseUrl(undefined, "production")).toThrow("required");
  });
  it.each(["", "bad", "ftp://api.test", "https://user:pass@api.test", "https://api.test/path", "https://api.test/?x=1", "https://api.test/#x"])("rejects %s", (value) => {
    expect(() => resolveApiBaseUrl(value, "production")).toThrow();
  });
});
