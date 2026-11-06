import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import type { MessageRecord } from "@/generated/contracts/messages";
import type { CursorPageInfo } from "@/generated/contracts/pagination";
import { isTransientError } from "@/lib/http";
import {
  createChat,
  deleteChat,
  getChat,
  listChats,
  listMessages,
  setChatFavorite,
  type ChatFilters,
} from "../api/chats";

const retry = (failureCount: number, error: unknown) => failureCount < 2 && isTransientError(error);
const retryDelay = (attempt: number) => Math.min(500 * 2 ** attempt, 2_000);

export const chatQueryKeys = {
  all: ["chats"] as const,
  detail: (chatId: string) => ["chats", "detail", chatId] as const,
  list: (filters: ChatFilters) => ["chats", "list", filters] as const,
  messages: (chatId: string, limit: number) => ["chats", chatId, "messages", limit] as const,
};

export function useChats(filters: ChatFilters = {}) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.list(filters),
    queryFn: ({ pageParam, signal }) => listChats(filters, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.pageInfo.nextCursor ?? undefined,
    retry,
    retryDelay,
  });
}

export function useChat(chatId: string) {
  return useQuery({
    queryKey: chatQueryKeys.detail(chatId),
    queryFn: ({ signal }) => getChat(chatId, signal),
    retry,
    retryDelay,
  });
}

export function useMessages(chatId: string, limit = 50) {
  return useInfiniteQuery({
    queryKey: chatQueryKeys.messages(chatId, limit),
    queryFn: ({ pageParam, signal }) => listMessages(chatId, { cursor: pageParam, limit }, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.data.pageInfo.nextCursor ?? undefined,
    retry,
    retryDelay,
  });
}

type MessagePage = { data: { items: MessageRecord[]; pageInfo: CursorPageInfo } };

// The API returns each page oldest-to-newest; reversing only pages keeps a newly arrived message last.
export function chronologicalMessages(data: InfiniteData<MessagePage, string | undefined> | undefined): MessageRecord[] {
  return data?.pages.toReversed().flatMap((page) => page.data.items) ?? [];
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
