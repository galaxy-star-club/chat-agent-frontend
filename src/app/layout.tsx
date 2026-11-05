import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agentic Chat",
  description: "Agentic Chat workspace foundation",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <ClerkProvider><html lang="en"><body><Providers>{children}</Providers></body></html></ClerkProvider>;
}
