import { Suspense } from "react";
import { AuthControls } from "@/components/auth-controls";
import { Workspace } from "@/modules/workspace/workspace";

export default function Home() {
  return <Workspace authControls={<Suspense fallback={null}><AuthControls /></Suspense>} />;
}
