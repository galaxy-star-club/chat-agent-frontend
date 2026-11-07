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
import { messageAdmissionResponseSchema, messageListResponseSchema, submitMessageRequestSchema } from "@/generated/contracts/messages";
import { cursorPaginationQuerySchema } from "@/generated/contracts/pagination";
import { agentRunRecordSchema } from "@/generated/contracts/run";
import { getApiBaseUrl } from "@/lib/config";
import { HttpError, requestJson } from "@/lib/http";

const chatResponseSchema = apiSuccessSchema(chatSchema);
const chatListSchema = apiSuccessSchema(chatListResponseSchema);
const messageListSchema = apiSuccessSchema(messageListResponseSchema);
const messageAdmissionSchema = apiSuccessSchema(messageAdmissionResponseSchema);
const agentRunSchema = apiSuccessSchema(agentRunRecordSchema);
const deleteChatSchema = z.void();
const uploadedAttachmentSchema = z.strictObject({
  id: z.uuid(), filename: z.string(), mediaType: z.string(), byteSize: z.number(), position: z.number(), status: z.enum(["pending", "ready", "failed"]), url: z.url().nullable(),
});
const uploadOptionsSchema = apiSuccessSchema(z.strictObject({ params: z.string(), signature: z.string(), attachments: z.array(uploadedAttachmentSchema) }));
const completeUploadSchema = apiSuccessSchema(z.strictObject({ attachments: z.array(uploadedAttachmentSchema) }));

export type ChatFilters = Partial<Pick<ChatListQuery, "favorite" | "limit" | "query">>;
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

export function submitMessage(chatId: string, input: z.input<typeof submitMessageRequestSchema>) {
  return requestJson(apiUrl(`${chatPath(chatId)}/messages`), messageAdmissionSchema, {
    auth: "session",
    method: "POST",
    body: submitMessageRequestSchema.parse(input),
    timeoutMs: 20_000,
  });
}

export function createUploadOptions(chatId: string, files: Array<{ name: string; type: string; size: number }>) {
  return requestJson(apiUrl(`${chatPath(chatId)}/attachments/options`), uploadOptionsSchema, { auth: "session", method: "POST", body: { files }, timeoutMs: 20_000 });
}

export function completeUpload(chatId: string, input: { assemblyUrl: string; attachmentIds: string[] }) {
  return requestJson(apiUrl(`${chatPath(chatId)}/attachments/complete`), completeUploadSchema, { auth: "session", method: "POST", body: input, timeoutMs: 20_000 });
}

export function getAgentRun(chatId: string, runId: string, signal?: AbortSignal) {
  return requestJson(apiUrl(`${chatPath(chatId)}/runs/${chatIdSchema.parse(runId)}`), agentRunSchema, { auth: "session", signal });
}

export function listMessages(chatId: string, input: CursorRequest, signal?: AbortSignal) {
  const query = cursorPaginationQuerySchema.parse(input);
  return requestJson(apiUrl(`${chatPath(chatId)}/messages`, query), messageListSchema, { auth: "session", signal });
}
