import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { delay } from "msw";
import { afterEach, expect, it, vi } from "vitest";
import { server } from "@/test/server";
import { Workspace } from "./workspace";

const url = "http://localhost:3001/api/v1/health";
const health = { status: "ok", service: "agentic-chat-api", contractVersion: "1.0.0" };
function renderWorkspace() {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><Workspace /></QueryClientProvider>);
}
afterEach(() => vi.unstubAllEnvs());

it("announces loading and a truthful connected state", async () => {
  server.use(http.get(url, async () => { await delay(30); return HttpResponse.json(health); }));
  renderWorkspace();
  expect(screen.getByText("Checking API connection…")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Checking…" })).toBeDisabled();
  expect(await screen.findByText("API connected")).toBeInTheDocument();
  expect(screen.getByText(/Health endpoint responded successfully. Sign in to open your tasks./)).toBeInTheDocument();
});
it("lets a user recover after a non-retried HTTP error", async () => {
  let calls = 0;
  server.use(http.get(url, () => { calls++; return new HttpResponse(null, { status: 403 }); }));
  renderWorkspace();
  const retry = await screen.findByRole("button", { name: "Retry connection" });
  expect(calls).toBe(1);
  expect(screen.getByText("API connection unavailable")).toBeInTheDocument();
  server.use(http.get(url, () => HttpResponse.json(health)));
  fireEvent.click(retry);
  expect(await screen.findByText("API connected")).toBeInTheDocument();
});
it("shows invalid-response errors without retries", async () => {
  server.use(http.get(url, () => HttpResponse.json({ status: "ok" })));
  renderWorkspace();
  expect(await screen.findByText("The API response did not match the expected contract.")).toBeInTheDocument();
});
it("explains configuration failures", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "not-an-origin");
  renderWorkspace();
  expect(await screen.findByText("API configuration needs attention")).toBeInTheDocument();
  expect(screen.getByText(/Set NEXT_PUBLIC_API_BASE_URL and rebuild/)).toBeInTheDocument();
});
