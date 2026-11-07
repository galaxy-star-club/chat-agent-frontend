import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MessageRecord } from "@/generated/contracts/messages";
import type { RunStatus } from "@/generated/contracts/run";
import { isTransientError } from "@/lib/http";
import {
  createChat,
  deleteChat,
  getAgentRun,
  getChat,
  listChats,
  listMessages,
  setChatFavorite,
  submitMessage,
  type ChatFilters,
} from "../api/chats";

export type { ChatFilters };

const retry = (failureCount: number, error: unknown) => failureCount < 2 && isTransientError(error);
const retryDelay = (attempt: number) => Math.min(500 * 2 ** attempt, 2_000);

export const chatQueryKeys = {
  all: ["chats"] as const,
  detail: (chatId: string) => ["chats", "detail", chatId] as const,
  list: (filters: ChatFilters) => ["chats", "list", filters] as const,
  messages: (chatId: string, limit: number) => ["chats", chatId, "messages", limit] as const,
};

export function useChats(filters: ChatFilters = {}, options?: { enabled?: boolean }) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.list(filters),
    queryFn: ({ pageParam, signal }) => listChats(filters, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.pageInfo.nextCursor ?? undefined,
    enabled: options?.enabled ?? true,
    retry,
    retryDelay,
    refetchOnWindowFocus: false,
  });
}

export function useChat(chatId: string, options?: { enabled?: boolean; refetchWhileActive?: boolean }) {
  return useQuery({
    queryKey: chatQueryKeys.detail(chatId),
    queryFn: ({ signal }) => getChat(chatId, signal),
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchWhileActive
      ? (query) => (query.state.data?.data.activeRunId ? 1_000 : false)
      : false,
    retry,
    retryDelay,
  });
}

export function useMessages(chatId: string, limit = 50, options?: { enabled?: boolean; refetchInterval?: number | false }) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.messages(chatId, limit),
    queryFn: ({ pageParam, signal }) => listMessages(chatId, { cursor: pageParam, limit }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.pageInfo.nextCursor ?? undefined,
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval,
    retry,
    retryDelay,
  });
}

const activeRun = new Set<RunStatus>(["pending", "running", "waiting"]);

export function useAgentRun(chatId: string, runId: string | null) {
  return useQuery({
    queryKey: ["chats", chatId, "runs", runId],
    queryFn: ({ signal }) => getAgentRun(chatId, runId ?? "", signal),
    enabled: Boolean(runId),
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      return !status || activeRun.has(status) ? 1_000 : false;
    },
    retry,
    retryDelay,
  });
}

// The API returns each page oldest-to-newest; reversing only pages keeps a newly arrived message last.
export function chronologicalMessages(data: { pages: Array<{ data: { items: MessageRecord[] } }> } | undefined): MessageRecord[] {
  return data?.pages.toReversed().flatMap((page) => page.data.items) ?? [];
}

export function useSubmitMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, ...input }: { chatId: string; idempotencyKey: string; text: string }) => submitMessage(chatId, input),
    retry: false,
    onSuccess: (response) => Promise.all([
      client.invalidateQueries({ queryKey: ["chats", response.data.chatId, "messages"] }),
      client.invalidateQueries({ queryKey: chatQueryKeys.detail(response.data.chatId) }),
      client.invalidateQueries({ queryKey: ["chats", response.data.chatId, "runs"] }),
    ]),
  });
}

export function useCreateChat() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: createChat,
    onSuccess: () => client.invalidateQueries({ queryKey: chatQueryKeys.all }),
  });
}

export function useDeleteChat() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: deleteChat,
    onSuccess: (_data, chatId) => {
      client.removeQueries({ queryKey: chatQueryKeys.detail(chatId) });
      client.removeQueries({ queryKey: ["chats", chatId, "messages"] });
      return client.invalidateQueries({ queryKey: chatQueryKeys.all });
    },
  });
}

export function useSetChatFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, isFavorite }: { chatId: string; isFavorite: boolean }) => setChatFavorite(chatId, { isFavorite }),
    onSuccess: (response) => {
      client.setQueryData(chatQueryKeys.detail(response.data.id), response);
      return client.invalidateQueries({ queryKey: chatQueryKeys.all });
    },
  });
}
