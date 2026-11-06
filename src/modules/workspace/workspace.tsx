"use client";

import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import { HttpError } from "@/lib/http";
import { useHealth } from "./hooks/use-health";

export function Workspace({ authControls }: { authControls?: React.ReactNode }) {
  const health = useHealth();
  const error = health.error instanceof HttpError ? health.error : undefined;
  const configurationError = error?.kind === "configuration" || error?.code === "CONFIGURATION_ERROR";
  return (
    <AppFrame sidebar={
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-sidebar p-4 md:h-full md:w-72 md:border-r md:border-b-0" aria-label="Sidebar">
        <p className="text-sm font-semibold">Agentic Chat</p>
        <div className="mt-4 md:mt-auto md:pb-16">{authControls}</div>
      </aside>
    }>
      <main id="main" className="flex-1 overflow-y-auto px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
          <p className="mt-3 text-muted-foreground">Sign in to browse, create, and review your tasks.</p>
          <section aria-labelledby="connection-title" aria-busy={health.isFetching} className="mt-8 rounded-lg border border-border bg-card p-6">
            <h2 id="connection-title" className="text-base font-semibold">Infrastructure connection</h2>
            <div role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-sm leading-6 text-muted-foreground">
              {health.isFetching ? <p>Checking API connection…</p> : health.isError ? <>
                <p className="font-medium text-foreground">{configurationError ? "API configuration needs attention" : "API connection unavailable"}</p>
                <p>{error?.message ?? "The connection check failed. Try again."}</p>
                {error?.requestId && <p className="mt-2 break-all font-mono text-xs">Request ID: {error.requestId}</p>}
              </> : health.isSuccess ? <>
                <p className="font-medium text-foreground">API connected</p>
                <p>Health endpoint responded successfully. Sign in to open your tasks.</p>
              </> : <p>Waiting to check API connection…</p>}
            </div>
            <Button type="button" className="mt-5" disabled={health.isFetching} onClick={() => void health.refetch()}>
              {health.isFetching ? "Checking…" : health.isError ? "Retry connection" : "Check again"}
            </Button>
          </section>
        </div>
      </main>
    </AppFrame>
  );
}
