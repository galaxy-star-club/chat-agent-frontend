import type { NextConfig } from "next";
import { resolveApiBaseUrl } from "./src/lib/config";

resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL, process.env.NODE_ENV);

const nextConfig: NextConfig = {
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};
export default nextConfig;
