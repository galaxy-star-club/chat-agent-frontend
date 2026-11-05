import { healthResponseSchema } from "@/generated/contracts/health";
import { getApiBaseUrl } from "@/lib/config";
import { getJson, HttpError } from "@/lib/http";

export function getHealth(signal?: AbortSignal) {
  let baseUrl: string;
  try { baseUrl = getApiBaseUrl(); } catch { throw new HttpError("configuration", "The API address is missing or invalid. Set NEXT_PUBLIC_API_BASE_URL and rebuild the frontend."); }
  return getJson(`${baseUrl}/api/v1/health`, healthResponseSchema, { signal });
}
