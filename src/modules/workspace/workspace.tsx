"use client";

import { Button } from "@/components/ui/button";
import { HttpError } from "@/lib/http";
import { useHealth } from "./hooks/use-health";

export function Workspace() {
  const health = useHealth();
  const error = health.error instanceof HttpError ? health.error : undefined;
  const configurationError = error?.kind === "configuration" || error?.code === "CONFIGURATION_ERROR";
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:bg-white focus:p-3">Skip to content</a>
      <header className="border-b border-zinc-200 bg-white px-6 py-5">
        <div className="mx-auto max-w-3xl text-lg font-semibold">Agentic Chat</div>
      </header>
      <main id="main" className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Workspace foundation</h1>
        <p className="mt-3 text-zinc-600">The basic application shell is ready. Chat is not yet enabled.</p>
        <section aria-labelledby="connection-title" aria-busy={health.isFetching} className="mt-8 rounded-lg border border-zinc-200 bg-white p-6">
          <h2 id="connection-title" className="text-base font-semibold">Infrastructure connection</h2>
          <div role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm leading-6 text-zinc-600">
            {health.isFetching ? <p>Checking API connection…</p> : health.isError ? <>
              <p className="font-medium text-zinc-900">{configurationError ? "API configuration needs attention" : "API connection unavailable"}</p>
              <p>{error?.message ?? "The connection check failed. Try again."}</p>
              {error?.requestId && <p className="mt-2 break-all font-mono text-xs">Request ID: {error.requestId}</p>}
            </> : health.isSuccess ? <>
              <p className="font-medium text-zinc-900">API connected</p>
              <p>Health endpoint responded successfully. Chat is not yet enabled.</p>
            </> : <p>Waiting to check API connection…</p>}
          </div>
          <Button type="button" className="mt-5" disabled={health.isFetching} onClick={() => void health.refetch()}>
            {health.isFetching ? "Checking…" : health.isError ? "Retry connection" : "Check again"}
          </Button>
        </section>
      </main>
    </div>
  );
}
