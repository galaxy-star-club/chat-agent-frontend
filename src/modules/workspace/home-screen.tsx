"use client";

import { useAuth } from "@clerk/nextjs";
import { AppFrame } from "@/components/app-frame";
import { ConversationWorkspace } from "@/modules/chats/conversation-workspace";
import { Workspace } from "./workspace";

export function HomeScreen({ authControls }: { authControls?: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) {
    return (
      <AppFrame sidebar={<p className="p-4 text-sm font-semibold">Agentic Chat</p>}>
        <main id="main" className="px-6 py-12">
          <h1 className="text-2xl font-semibold tracking-tight">Agentic Chat</h1>
          <p role="status" className="mt-3 text-sm text-muted-foreground">Checking your session…</p>
        </main>
      </AppFrame>
    );
  }
  if (!isSignedIn) return <Workspace authControls={authControls} />;
  return <ConversationWorkspace authControls={authControls} />;
}
