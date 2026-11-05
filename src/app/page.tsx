import { AuthControls } from "@/components/auth-controls";
import { Workspace } from "@/modules/workspace/workspace";

export default function Home() { return <Workspace authControls={<AuthControls />} />; }
