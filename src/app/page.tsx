import { Suspense } from "react";
import { AuthControls } from "@/components/auth-controls";
import { HomeScreen } from "@/modules/workspace/home-screen";

export default function Home() {
  return <HomeScreen authControls={<Suspense fallback={null}><AuthControls /></Suspense>} />;
}
