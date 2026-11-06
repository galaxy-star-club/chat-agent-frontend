import { z } from "zod";
import { apiSuccessSchema } from "@/generated/contracts/api";
import {
  chatIdSchema,
  chatListQuerySchema,
  chatListResponseSchema,
  chatSchema,
  createChatRequestSchema,
  updateFavoriteRequestSchema,
  type ChatListQuery,
} from "@/generated/contracts/chats";
import { messageListResponseSchema } from "@/generated/contracts/messages";
import { cursorPaginationQuerySchema } from "@/generated/contracts/pagination";
import { getApiBaseUrl } from "@/lib/config";
import { HttpError, requestJson } from "@/lib/http";

const chatResponseSchema = apiSuccessSchema(chatSchema);
const chatListSchema = apiSuccessSchema(chatListResponseSchema);
const messageListSchema = apiSuccessSchema(messageListResponseSchema);
const deleteChatSchema = apiSuccessSchema(z.unknown());

export type ChatFilters = Pick<ChatListQuery, "favorite" | "limit" | "query">;
export type CursorRequest = z.output<typeof cursorPaginationQuerySchema>;

function apiUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  let baseUrl: string;
  try { baseUrl = getApiBaseUrl(); } catch { throw new HttpError("configuration", "The API address is missing or invalid. Set NEXT_PUBLIC_API_BASE_URL and rebuild the frontend."); }
  const url = new URL(`/api/v1${path}`, baseUrl);
  for (const [name, value] of Object.entries(query ?? {})) if (value !== undefined) url.searchParams.set(name, String(value));
  return url.toString();
}

function chatPath(chatId: string) {
  return `/chats/${chatIdSchema.parse(chatId)}`;
}

export function listChats(filters: ChatFilters = {}, cursor?: string, signal?: AbortSignal) {
  const query = chatListQuerySchema.parse({
    ...filters,
    cursor,
    favorite: filters.favorite === undefined ? undefined : String(filters.favorite),
  });
  return requestJson(apiUrl("/chats", query), chatListSchema, { auth: "session", signal });
}

export function getChat(chatId: string, signal?: AbortSignal) {
  return requestJson(apiUrl(chatPath(chatId)), chatResponseSchema, { auth: "session", signal });
}

export function createChat(input: z.input<typeof createChatRequestSchema>) {
  return requestJson(apiUrl("/chats"), chatResponseSchema, {
    auth: "session", body: createChatRequestSchema.parse(input), method: "POST",
  });
}

export function deleteChat(chatId: string) {
  return requestJson(apiUrl(chatPath(chatId)), deleteChatSchema, { auth: "session", method: "DELETE" });
}

export function setChatFavorite(chatId: string, input: z.input<typeof updateFavoriteRequestSchema>) {
  return requestJson(apiUrl(`${chatPath(chatId)}/favorite`), chatResponseSchema, {
    auth: "session", body: updateFavoriteRequestSchema.parse(input), method: "PATCH",
  });
}

export function listMessages(chatId: string, input: CursorRequest, signal?: AbortSignal) {
  const query = cursorPaginationQuerySchema.parse(input);
  return requestJson(apiUrl(`${chatPath(chatId)}/messages`, query), messageListSchema, { auth: "session", signal });
}
