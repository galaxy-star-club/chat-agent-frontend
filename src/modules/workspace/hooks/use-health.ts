import { useQuery } from "@tanstack/react-query";
import { isTransientError } from "@/lib/http";
import { getHealth } from "../api/health";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
    retry: (failureCount, error) => failureCount < 2 && isTransientError(error),
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2_000),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
