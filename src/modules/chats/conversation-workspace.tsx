"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Uppy from "@uppy/core";
import Transloadit from "@uppy/transloadit";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, Calendar, Ellipsis, Folder, ListTodo, PanelLeftClose, PanelLeftOpen, Paperclip, Plus, Search, Sparkles, Square, Star, Trash } from "lucide-react";
import { AppFrame } from "@/components/app-frame";
import { Button } from "@/components/ui/button";
import type { ChatRecord } from "@/generated/contracts/chats";
import { plainTextMaxCharacters, type MessageRecord } from "@/generated/contracts/messages";
import type { RunStatus } from "@/generated/contracts/run";
import { HttpError } from "@/lib/http";
import { cn } from "@/lib/utils";
import { MessageBlocks } from "./message-blocks";
import { completeUpload, createUploadOptions, streamAgentRun } from "./api/chats";
import { formatClock, formatTaskTime, taskTitle } from "./task-time";
import {
  chronologicalMessages,
  chatQueryKeys,
  useAgentRun,
  useChat,
  useChats,
  useCreateChat,
  useDeleteChat,
  useMessages,
  useSetChatFavorite,
  useSubmitMessage,
  type ChatFilters,
} from "./hooks/use-chats";

type Admission = { chatId: string; runId: string; status: RunStatus };
type MessagePages = { pages: Array<{ data: { items: MessageRecord[] } }>; pageParams: unknown[] };
const activeStatuses = new Set<RunStatus>(["pending", "running", "waiting"]);

type View = "home" | "tasks" | "conversation";
const unavailable = [
  ["Projects", Folder, "Projects are not available yet."],
  ["Artifacts", Square, "Artifacts are not available yet."],
  ["Scheduled", Calendar, "Scheduled tasks are not available yet."],
  ["More", Ellipsis, "More options are not available yet."],
] as const;

function useClientReady() {
  return useSyncExternalStore(emptySubscribe, clientReady, serverReady);
}
function emptySubscribe() { return () => undefined; }
function clientReady() { return true; }
function serverReady() { return false; }

function chatItems(data: { pages: Array<{ data: { items: ChatRecord[] } }> } | undefined) {
  return data?.pages.flatMap((page) => page.data.items) ?? [];
}

function errorCopy(error: unknown) {
  if (error instanceof HttpError) {
    const configuration = error.kind === "configuration" || error.code === "CONFIGURATION_ERROR";
    return {
      title: configuration ? "API configuration needs attention" : "This request failed",
      message: error.message,
      requestId: error.requestId,
    };
  }
  return { title: "This request failed", message: "Something went wrong. Try again.", requestId: undefined };
}

function isNotFound(error: unknown) {
  return error instanceof HttpError && error.code === "NOT_FOUND";
}

export function ConversationWorkspace({ authControls }: { authControls?: React.ReactNode }) {
  const isClient = useClientReady();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<View>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [admission, setAdmission] = useState<Admission | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const opened = useRef(false);
  const filters: ChatFilters = { ...(search ? { query: search } : {}), ...(favoritesOnly ? { favorite: true } : {}) };
  const filtering = Boolean(filters.query) || filters.favorite === true;
  const recent = useChats({}, { enabled: isClient });
  const filtered = useChats(filters, { enabled: isClient && filtering });
  const tasks = filtering ? filtered : recent;
  const creating = useCreateChat();
  const deleting = useDeleteChat();
  const favorite = useSetChatFavorite();

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);
  useEffect(() => {
    if (!opened.current) { opened.current = true; return; }
    headingRef.current?.focus();
  }, [view, selectedId]);

  const createTask = useCallback(async () => {
    if (creating.isPending) return;
    const response = await creating.mutateAsync({});
    setSelectedId(response.data.id);
    setView("conversation");
    setNotice("Task created.");
  }, [creating]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "n" || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.repeat) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select")) return;
      event.preventDefault();
      void createTask().catch(() => undefined);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [createTask]);

  function changeSearch(value: string) {
    setSearchInput(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(value.trim()), 300);
  }

  function openSearch() {
    setView("tasks");
    setSidebarOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  }

  function openChat(chatId: string) {
    setSelectedId(chatId);
    setView("conversation");
    setConfirmId(null);
  }

  async function removeTask(chatId: string) {
    await deleting.mutateAsync(chatId);
    setConfirmId(null);
    setSelectedId((current) => (current === chatId ? null : current));
    setView("home");
    setNotice("Task deleted.");
  }

  function toggleFavorite(chatId: string, isFavorite: boolean) {
    void favorite.mutateAsync({ chatId, isFavorite }).then(() => {
      setNotice(isFavorite ? "Saved to favorites." : "Removed from favorites.");
    }).catch(() => undefined);
  }

  const recentChats = chatItems(recent.data);
  const taskChats = chatItems(tasks.data);
  const actionError = creating.error ?? deleting.error ?? favorite.error;

  return (
    <AppFrame sidebar={sidebarOpen ? (
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-sidebar md:h-full md:w-[300px] md:overflow-y-auto md:rounded-2xl md:border" aria-label="Sidebar">
        <div className="flex items-center gap-1 px-5 py-5">
          <p className="px-2 text-xl font-semibold tracking-tight">Agentic Chat</p>
          <Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label="Search tasks" onClick={openSearch}><Search aria-hidden="true" className="size-4" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Hide sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose aria-hidden="true" className="size-4" /></Button>
        </div>
        <div className="px-4">
          <Button type="button" variant="ghost" className="h-12 w-full justify-start text-base" onClick={() => void createTask().catch(() => undefined)} disabled={creating.isPending}>
            <Plus aria-hidden="true" className="size-4" /> New task
          </Button>
        </div>
        <nav aria-label="Sections" className="px-4 py-3">
          <ul className="space-y-1">
            <li>
              <Button type="button" variant="ghost" className="h-12 w-full justify-start text-base" aria-current={view === "tasks" ? "page" : undefined} onClick={() => setView("tasks")}>
                <ListTodo aria-hidden="true" className="size-4" /> Tasks
              </Button>
            </li>
            {unavailable.map(([label, Icon, message]) => (
              <li key={label}>
              <Button type="button" variant="ghost" className="h-12 w-full justify-start text-base text-muted-foreground" onClick={() => setNotice(message)}>
                  <Icon aria-hidden="true" className="size-4" /> {label}
                </Button>
              </li>
            ))}
          </ul>
        </nav>
        <section aria-labelledby="recent-tasks-title" className="px-4 py-4" aria-busy={recent.isFetching}>
          <h2 id="recent-tasks-title" className="px-2 text-sm font-medium text-muted-foreground">Recent tasks</h2>
          {recent.isLoading && <p role="status" className="px-2 py-3 text-sm text-muted-foreground">Loading tasks…</p>}
          {recent.isError && !recent.data && <p className="px-2 py-3 text-sm text-muted-foreground">Recent tasks could not be loaded.</p>}
          {recent.isSuccess && recentChats.length === 0 && <p className="px-2 py-3 text-sm text-muted-foreground">No tasks yet.</p>}
          {recentChats.length > 0 && (
            <ul aria-label="Recent tasks" className="mt-1 space-y-1">
              {recentChats.map((chat) => {
                const title = taskTitle(chat.title);
                const selected = view === "conversation" && chat.id === selectedId;
                return (
                  <li key={chat.id}>
                    <button type="button" aria-current={selected ? "page" : undefined} onClick={() => openChat(chat.id)} className={cn("flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", selected ? "bg-accent font-medium" : "hover:bg-accent")}>
                      <span className="min-w-0 flex-1 truncate">{title}</span>
                      {chat.isFavorite && <><Star aria-hidden="true" className="size-3.5 shrink-0 fill-current" /><span className="sr-only">Favorite</span></>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {recent.hasNextPage && (
            <Button type="button" variant="ghost" className="mt-2 w-full" disabled={recent.isFetchingNextPage} onClick={() => void recent.fetchNextPage()}>
              {recent.isFetchingNextPage ? "Loading more tasks…" : "Load more recent tasks"}
            </Button>
          )}
          {recent.isFetchNextPageError && <div className="px-2 pt-2"><ErrorNote error={recent.error} onRetry={() => void recent.fetchNextPage()} retryLabel="Retry loading more tasks" /></div>}
        </section>
        <div className="mt-auto border-t border-border p-3 md:pb-16">{authControls}</div>
      </aside>
    ) : null}>
      <main id="main" className="flex flex-1 flex-col md:min-h-0">
        {notice ? <p role="status" aria-live="polite" className="border-b border-border px-6 py-2 text-sm text-muted-foreground">{notice}</p> : <p role="status" aria-live="polite" className="sr-only" />}
        {actionError && <div className="px-6 pt-4"><ErrorNote error={actionError} onRetry={() => undefined} retryLabel="Dismiss" hideRetry /></div>}
        {view === "tasks" ? (
          <TasksView
            headingRef={headingRef}
            sidebarOpen={sidebarOpen}
            onShowSidebar={() => setSidebarOpen(true)}
            search={search}
            searchInput={searchInput}
            searchRef={searchRef}
            onSearch={changeSearch}
            favoritesOnly={favoritesOnly}
            onFavoritesOnly={setFavoritesOnly}
            tasks={tasks}
            taskChats={taskChats}
            creating={creating.isPending}
            onCreate={() => void createTask().catch(() => undefined)}
            confirmId={confirmId}
            onConfirm={setConfirmId}
            onDelete={(chatId) => void removeTask(chatId).catch(() => undefined)}
            onOpen={openChat}
            onFavorite={toggleFavorite}
            pendingFavoriteId={favorite.isPending ? favorite.variables?.chatId : undefined}
            deleting={deleting.isPending}
          />
        ) : view === "conversation" && selectedId ? (
          <SelectedTask
            headingRef={headingRef}
            chatId={selectedId}
            sidebarOpen={sidebarOpen}
            onShowSidebar={() => setSidebarOpen(true)}
            confirmId={confirmId}
            onConfirm={setConfirmId}
            onDelete={(chatId) => void removeTask(chatId).catch(() => undefined)}
            onFavorite={toggleFavorite}
            pendingFavorite={favorite.isPending}
            deleting={deleting.isPending}
            onBack={() => { setSelectedId(null); setView("home"); }}
            admission={admission?.chatId === selectedId ? admission : null}
            onAdmitted={(next) => { setAdmission(next); setNotice(runStatusText[next.status]); }}
          />
        ) : (
          <HomeView headingRef={headingRef} sidebarOpen={sidebarOpen} onShowSidebar={() => setSidebarOpen(true)} listError={recent.isError && !recent.data ? recent.error : undefined} onRetry={() => void recent.refetch()} showClock={isClient} onAdmitted={(next) => { setAdmission(next); setSelectedId(next.chatId); setView("conversation"); setNotice(runStatusText[next.status]); }} />
        )}
      </main>
    </AppFrame>
  );
}

function ErrorNote({ error, onRetry, retryLabel, hideRetry = false }: { error: unknown; onRetry: () => void; retryLabel: string; hideRetry?: boolean }) {
  const copy = errorCopy(error);
  return (
    <div role="alert" className="rounded-lg border border-border bg-card p-4 text-sm">
      <p className="font-medium">{copy.title}</p>
      <p className="mt-1 text-muted-foreground">{copy.message}</p>
      {copy.requestId && <p className="mt-2 break-all font-mono text-xs">Request ID: {copy.requestId}</p>}
      {!hideRetry && <Button type="button" className="mt-4" onClick={onRetry}>{retryLabel}</Button>}
    </div>
  );
}

function Composer({ placeholder, chatId, busy = false, onAdmitted }: {
  placeholder: string;
  chatId?: string;
  busy?: boolean;
  onAdmitted: (admission: Admission) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const intent = useRef<{ text: string; key: string } | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = useSubmitMessage();
  const create = useCreateChat();
  const sending = submit.isPending || create.isPending;
  const canSend = !busy && (text.trim().length > 0 || uploadedUrls.length > 0) && text.length <= plainTextMaxCharacters && !sending && !uploading;
  const fieldId = chatId ? `composer-${chatId}` : "composer-home";

  async function send() {
    if (!canSend) return;
    const value = [text.trim(), uploadedUrls.length ? `Attachments:\n${uploadedUrls.map((url) => `- ${url}`).join("\n")}` : ""].filter(Boolean).join("\n\n");
    const key = intent.current?.text === value ? intent.current.key : crypto.randomUUID();
    intent.current = { text: value, key };
    setError(null);
    try {
      let targetId = chatId;
      if (!targetId) {
        const created = await create.mutateAsync({});
        targetId = created.data.id;
      }
      const response = await submit.mutateAsync({ chatId: targetId, idempotencyKey: key, text: value });
      onAdmitted({ chatId: response.data.chatId, runId: response.data.runId, status: response.data.status });
      setText("");
      setUploadedUrls([]);
      intent.current = null;
    } catch (sendError) {
      setError(sendError);
      fieldRef.current?.focus();
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length || busy || uploading) return;
    setError(null);
    setUploading(true);
    let uppy: Uppy | undefined;
    try {
      let targetId = chatId;
      if (!targetId) targetId = (await create.mutateAsync({})).data.id;
      const selected = Array.from(files);
      const options = await createUploadOptions(targetId, selected.map((file) => ({ name: file.name, type: file.type, size: file.size })));
      uppy = new Uppy({ autoProceed: false, restrictions: { maxNumberOfFiles: 4, maxFileSize: 512 * 1024 * 1024, allowedFileTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm", "video/quicktime", "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"] } });
      uppy.use(Transloadit, { waitForEncoding: true, assemblyOptions: { params: options.data.params, signature: options.data.signature } });
      selected.forEach((file) => uppy!.addFile({ name: file.name, type: file.type, data: file }));
      const assemblyUrl = await new Promise<string>((resolve, reject) => {
        uppy!.once("transloadit:complete", (assembly: { assembly_ssl_url?: string }) => assembly.assembly_ssl_url ? resolve(assembly.assembly_ssl_url) : reject(new Error("Upload did not return an assembly URL.")));
        uppy!.once("error", reject);
        void uppy!.upload();
      });
      const completed = await completeUpload(targetId, { assemblyUrl, attachmentIds: options.data.attachments.map((attachment) => attachment.id) });
      setUploadedUrls((current) => [...current, ...completed.data.attachments.flatMap((attachment) => attachment.url ? [attachment.url] : [])]);
    } catch (uploadError) {
      setError(uploadError);
    } finally {
      uppy?.destroy();
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const copy = error ? errorCopy(error) : null;
  return (
    <div role="group" aria-label="Message composer" className="relative rounded-[28px] border border-border bg-card p-5 shadow-sm">
      <label htmlFor={fieldId} className="sr-only">Message</label>
      <textarea ref={fieldRef} id={fieldId} rows={3} value={text} maxLength={plainTextMaxCharacters} placeholder={placeholder} aria-invalid={error ? true : undefined} aria-describedby={error ? "composer-error" : "composer-note"} onChange={(event) => setText(event.target.value)} className="w-full resize-none bg-transparent px-2 py-1 text-base outline-none placeholder:text-muted-foreground" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <input ref={fileRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/wav,audio/ogg,audio/mp4" multiple onChange={(event) => void upload(event.target.files)} />
          <Button type="button" variant="ghost" size="icon" disabled={busy || sending || uploading} aria-label="Attach media files" onClick={() => fileRef.current?.click()}><Paperclip aria-hidden="true" className="size-5" /></Button>
          <Button type="button" variant="ghost" className="h-10 gap-2 rounded-full px-3" aria-expanded={skillsOpen} aria-controls={`${fieldId}-skills`} onClick={() => setSkillsOpen((open) => !open)}><Sparkles aria-hidden="true" className="size-4" /> Skills</Button>
        </div>
        <Button type="button" className="rounded-full" size="icon" disabled={!canSend} aria-label="Send message" onClick={() => void send()}><ArrowUp aria-hidden="true" className="size-4" /></Button>
      </div>
      {skillsOpen && <div id={`${fieldId}-skills`} className="absolute bottom-16 left-5 z-10 w-80 rounded-2xl border border-border bg-popover p-4 shadow-lg">
        <p className="font-medium">Skills</p>
        <p className="mt-1 text-sm text-muted-foreground">The agent loads available skills automatically when your request needs them.</p>
        <ul className="mt-3 space-y-2 text-sm">
          <li><span className="font-medium">Video background removal</span><br /><span className="text-muted-foreground">For transparent video cutouts.</span></li>
          <li><span className="font-medium">Video upscaling</span><br /><span className="text-muted-foreground">For clearer video at 1080p or 4K.</span></li>
        </ul>
      </div>}
      {copy ? (
        <div id="composer-error" role="alert" className="px-2 pt-2 text-xs">
          <p className="font-medium">{copy.title}</p>
          <p className="mt-1 text-muted-foreground">{copy.message}</p>
          {copy.requestId && <p className="mt-1 break-all font-mono">Request ID: {copy.requestId}</p>}
          <Button type="button" className="mt-2" disabled={sending} onClick={() => void send()}>Retry send</Button>
        </div>
      ) : (
        <p id="composer-note" className="px-2 text-xs text-muted-foreground">{busy ? "A reply is in progress." : uploading ? "Uploading media…" : uploadedUrls.length ? `${uploadedUrls.length} media file${uploadedUrls.length === 1 ? "" : "s"} attached.` : "Attach image, video, or audio files up to 512 MB each."}</p>
      )}
    </div>
  );
}

function HomeView({ headingRef, sidebarOpen, onShowSidebar, listError, onRetry, showClock, onAdmitted }: { headingRef: React.RefObject<HTMLHeadingElement | null>; sidebarOpen: boolean; onShowSidebar: () => void; listError: unknown; onRetry: () => void; showClock: boolean; onAdmitted: (admission: Admission) => void }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
      {!sidebarOpen && <Button type="button" variant="outline" className="mb-6 self-start" onClick={onShowSidebar}><PanelLeftOpen aria-hidden="true" className="size-4" /> Show sidebar</Button>}
      {listError ? <ErrorNote error={listError} onRetry={onRetry} retryLabel="Retry loading tasks" /> : null}
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center text-center">
        <div aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-primary text-xl font-semibold text-primary-foreground">A</div>
        <p className="mt-4 min-h-5 text-sm text-muted-foreground">{showClock ? formatClock(new Date()) : ""}</p>
        <h1 ref={headingRef} tabIndex={-1} className="mt-3 text-4xl font-semibold tracking-tight focus:outline-2 focus:outline-offset-4 focus:outline-ring">Your AI worker</h1>
        <p className="mt-3 text-lg text-muted-foreground">Work at the speed of thought.</p>
        <div className="mt-10 w-full text-left"><Composer placeholder="Assign a task or ask anything..." onAdmitted={onAdmitted} /></div>
      </div>
    </div>
  );
}

function TasksView({ headingRef, sidebarOpen, onShowSidebar, search, searchInput, searchRef, onSearch, favoritesOnly, onFavoritesOnly, tasks, taskChats, creating, onCreate, confirmId, onConfirm, onDelete, onOpen, onFavorite, pendingFavoriteId, deleting }: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  sidebarOpen: boolean;
  onShowSidebar: () => void;
  search: string;
  searchInput: string;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onSearch: (value: string) => void;
  favoritesOnly: boolean;
  onFavoritesOnly: (value: boolean) => void;
  tasks: ReturnType<typeof useChats>;
  taskChats: ChatRecord[];
  creating: boolean;
  onCreate: () => void;
  confirmId: string | null;
  onConfirm: (chatId: string | null) => void;
  onDelete: (chatId: string) => void;
  onOpen: (chatId: string) => void;
  onFavorite: (chatId: string, isFavorite: boolean) => void;
  pendingFavoriteId: string | undefined;
  deleting: boolean;
}) {
  const emptyLabel = search ? "No tasks match your search." : favoritesOnly ? "No favorite tasks yet." : "No tasks yet.";
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
      <div className="flex flex-wrap items-center gap-3">
        {!sidebarOpen && <Button type="button" variant="outline" onClick={onShowSidebar}><PanelLeftOpen aria-hidden="true" className="size-4" /> Show sidebar</Button>}
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-semibold tracking-tight focus:outline-2 focus:outline-offset-4 focus:outline-ring">Tasks</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label htmlFor="task-filter" className="text-sm text-muted-foreground">Filter by</label>
          <select id="task-filter" value={favoritesOnly ? "favorites" : "all"} onChange={(event) => onFavoritesOnly(event.target.value === "favorites")} className="min-h-10 rounded-full border border-border bg-background px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <option value="all">All</option>
            <option value="favorites">Favorites</option>
          </select>
          <Button type="button" aria-keyshortcuts="N" disabled={creating} onClick={onCreate}>
            <Plus aria-hidden="true" className="size-4" /> New task <kbd aria-hidden="true" className="rounded border border-primary-foreground/30 px-1 text-xs">N</kbd>
          </Button>
        </div>
      </div>
      <label htmlFor="task-search" className="sr-only">Search tasks</label>
      <input ref={searchRef} id="task-search" type="search" value={searchInput} maxLength={200} placeholder="Search tasks..." onChange={(event) => onSearch(event.target.value)} className="mt-5 h-11 w-full rounded-full border border-border bg-background px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
      <div className="mt-6" aria-busy={tasks.isFetching}>
        {tasks.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading tasks…</p>}
        {tasks.isError && !tasks.data && <ErrorNote error={tasks.error} onRetry={() => void tasks.refetch()} retryLabel="Retry loading tasks" />}
        {tasks.isSuccess && taskChats.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
        {taskChats.length > 0 && (
          <ul aria-label="Tasks" className="divide-y divide-border">
            {taskChats.map((chat) => {
              const title = taskTitle(chat.title);
              return (
                <li key={chat.id} className="flex items-center gap-2 py-3">
                  <button type="button" onClick={() => onOpen(chat.id)} className="min-w-0 flex-1 rounded-md px-1 py-2 text-left text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    <span className="block truncate">{title}</span>
                  </button>
                  <time dateTime={chat.updatedAt} className="shrink-0 text-sm text-muted-foreground">{formatTaskTime(chat.updatedAt)}</time>
                  <Button type="button" variant="ghost" size="icon" aria-pressed={chat.isFavorite} aria-label={chat.isFavorite ? `Remove ${title} from favorites` : `Add ${title} to favorites`} disabled={pendingFavoriteId === chat.id} onClick={() => onFavorite(chat.id, !chat.isFavorite)}>
                    <Star aria-hidden="true" className={cn("size-4", chat.isFavorite && "fill-current")} />
                  </Button>
                  {confirmId === chat.id ? (
                    <>
                      <Button type="button" disabled={deleting} onClick={() => onDelete(chat.id)}>Confirm delete {title}</Button>
                      <Button type="button" variant="outline" onClick={() => onConfirm(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${title}`} onClick={() => onConfirm(chat.id)}><Trash aria-hidden="true" className="size-4" /></Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {tasks.hasNextPage && (
          <Button type="button" variant="outline" className="mt-4" disabled={tasks.isFetchingNextPage} onClick={() => void tasks.fetchNextPage()}>
            {tasks.isFetchingNextPage ? "Loading more tasks…" : "Load more tasks"}
          </Button>
        )}
        {tasks.isFetchNextPageError && <div className="mt-4"><ErrorNote error={tasks.error} onRetry={() => void tasks.fetchNextPage()} retryLabel="Retry loading more tasks" /></div>}
      </div>
    </div>
  );
}

const runStatusText: Record<RunStatus, string> = {
  pending: "Your message was saved. The run is pending.",
  running: "The run is running.",
  waiting: "The run is waiting.",
  completed: "The run is completed.",
  failed: "The run failed. Your message was saved.",
  cancelled: "The run was cancelled.",
};

const roleLabel = { user: "You", assistant: "Assistant", system: "System", tool: "Tool" } as const;
const statusLabel = { streaming: "Still streaming", completed: "Completed", failed: "Failed", cancelled: "Cancelled" } as const;

function latestRunId(messages: MessageRecord[]): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const runId = messages[index]?.runId;
    if (runId) return runId;
  }
  return null;
}

function SelectedTask({ headingRef, chatId, sidebarOpen, onShowSidebar, confirmId, onConfirm, onDelete, onFavorite, pendingFavorite, deleting, onBack, admission, onAdmitted }: {
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  chatId: string;
  sidebarOpen: boolean;
  onShowSidebar: () => void;
  confirmId: string | null;
  onConfirm: (chatId: string | null) => void;
  onDelete: (chatId: string) => void;
  onFavorite: (chatId: string, isFavorite: boolean) => void;
  pendingFavorite: boolean;
  deleting: boolean;
  onBack: () => void;
  admission: Admission | null;
  onAdmitted: (admission: Admission) => void;
}) {
  const client = useQueryClient();
  const chat = useChat(chatId);
  const hintedRunId = chat.data?.data.activeRunId ?? admission?.runId ?? null;
  const hintedRun = useAgentRun(chatId, hintedRunId);
  const messages = useMessages(chatId, 50);
  const historicalRun = useAgentRun(chatId, hintedRunId ? null : latestRunId(chronologicalMessages(messages.data)));
  const run = hintedRunId ? hintedRun : historicalRun;
  const runStatus = run.data?.data.status;
  const savedTitle = chat.data?.data.title ?? null;
  const streamedRun = useRef<string | null>(null);
  useEffect(() => {
    if (!hintedRunId || streamedRun.current === hintedRunId) return;
    streamedRun.current = hintedRunId;
    const controller = new AbortController();
    void streamAgentRun(chatId, hintedRunId, (message) => {
      client.setQueryData<MessagePages>(chatQueryKeys.messages(chatId, 50), (current) => {
        if (!current) return current;
        return {
          ...current,
          pages: current.pages.map((page, index) => index !== 0 ? page : {
            ...page,
            data: {
              ...page.data,
              items: page.data.items.some((item) => item.id === message.id)
                ? page.data.items.map((item) => item.id === message.id ? message : item)
                : [message, ...page.data.items],
            },
          }),
        };
      });
    }, controller.signal).catch(() => undefined).finally(() => {
      void client.invalidateQueries({ queryKey: chatQueryKeys.detail(chatId) });
      void client.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
      void client.invalidateQueries({ queryKey: ["chats", chatId, "runs"] });
      void client.invalidateQueries({ queryKey: ["chats", "list"] });
    });
    return () => controller.abort();
  }, [chatId, client, hintedRunId, messages.data]);
  useEffect(() => {
    if (!savedTitle) return;
    void client.invalidateQueries({ queryKey: ["chats", "list"] });
  }, [client, savedTitle]);
  useEffect(() => {
    if (!runStatus || activeStatuses.has(runStatus)) return;
    void client.invalidateQueries({ queryKey: chatQueryKeys.detail(chatId) });
    void client.invalidateQueries({ queryKey: ["chats", "list"] });
    void client.invalidateQueries({ queryKey: ["chats", chatId, "messages"] });
  }, [client, chatId, runStatus]);
  if (chat.isLoading) {
    return <div className="px-6 py-8"><p role="status">Loading task…</p></div>;
  }
  if (isNotFound(chat.error)) {
    return (
      <div className="px-6 py-8">
        <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight focus:outline-2 focus:outline-offset-4 focus:outline-ring">This task is no longer available.</h1>
        <p className="mt-3 text-muted-foreground">It may have been deleted. Your other tasks are still in the sidebar.</p>
        <Button type="button" className="mt-5" onClick={onBack}>Back to your tasks</Button>
      </div>
    );
  }
  if (chat.isError || !chat.data) {
    return <div className="px-6 py-8"><ErrorNote error={chat.error} onRetry={() => void chat.refetch()} retryLabel="Retry loading task" /></div>;
  }
  const record = chat.data.data;
  const title = taskTitle(record.title);
  const ordered = chronologicalMessages(messages.data);
  const displayed = run.data?.data.status ?? admission?.status;
  const busy = Boolean(record.activeRunId) || (displayed ? activeStatuses.has(displayed) : false);
  const showStatus = Boolean(displayed) && (displayed !== "completed" || admission?.runId === run.data?.data.id);
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-6 py-4">
        {!sidebarOpen && <Button type="button" variant="outline" onClick={onShowSidebar}><PanelLeftOpen aria-hidden="true" className="size-4" /> Show sidebar</Button>}
        <div className="min-w-0">
          <h1 ref={headingRef} tabIndex={-1} className="truncate text-xl font-semibold tracking-tight focus:outline-2 focus:outline-offset-4 focus:outline-ring">{title}</h1>
          <p className="text-sm text-muted-foreground">Updated <time dateTime={record.updatedAt}>{formatTaskTime(record.updatedAt)}</time></p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button type="button" variant={record.isFavorite ? "default" : "outline"} aria-pressed={record.isFavorite} disabled={pendingFavorite} onClick={() => onFavorite(record.id, !record.isFavorite)}>
            <Star aria-hidden="true" className={cn("size-4", record.isFavorite && "fill-current")} /> {record.isFavorite ? "Favorited" : "Add to favorites"}
          </Button>
          {confirmId === record.id ? (
            <>
              <Button type="button" disabled={deleting} onClick={() => onDelete(record.id)}>Confirm delete {title}</Button>
              <Button type="button" variant="outline" onClick={() => onConfirm(null)}>Cancel</Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={() => onConfirm(record.id)}>Delete {title}</Button>
          )}
        </div>
      </header>
      <section aria-labelledby="messages-heading" aria-busy={messages.isFetching} className="flex-1 overflow-y-auto px-6 py-6">
        <h2 id="messages-heading" className="sr-only">Messages</h2>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
          {messages.hasNextPage && (
            <Button type="button" variant="outline" className="self-center" disabled={messages.isFetchingNextPage} onClick={() => void messages.fetchNextPage()}>
              {messages.isFetchingNextPage ? "Loading earlier messages…" : "Load earlier messages"}
            </Button>
          )}
          {messages.isLoading && <p role="status">Loading messages…</p>}
          {messages.isError && !messages.data && <ErrorNote error={messages.error} onRetry={() => void messages.refetch()} retryLabel="Retry loading messages" />}
          {messages.isFetchNextPageError && <ErrorNote error={messages.error} onRetry={() => void messages.fetchNextPage()} retryLabel="Retry loading earlier messages" />}
          {messages.isSuccess && ordered.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          <ol className="flex flex-col gap-5" aria-label="Message history">
            {ordered.map((message) => <MessageItem key={message.id} message={message} />)}
          </ol>
        </div>
      </section>
      <div className="px-6 pb-6">
        <div className="mx-auto w-full max-w-3xl">
          {showStatus && displayed && <p role="status" className="mb-3 text-sm text-muted-foreground">{runStatusText[displayed]}</p>}
          {run.data?.data.error && displayed && !activeStatuses.has(displayed) && (
            <div role="alert" className="mb-3 rounded-lg border border-border bg-card p-3 text-sm">
              <p>{run.data.data.error.message}</p>
            </div>
          )}
          <Composer placeholder="Send a message..." chatId={chatId} busy={busy} onAdmitted={onAdmitted} />
        </div>
      </div>
    </div>
  );
}

function MessageItem({ message }: { message: MessageRecord }) {
  const yours = message.role === "user";
  return (
    <li className={cn("max-w-[85%]", yours ? "ml-auto" : "mr-auto")}>
      <article aria-label={`${roleLabel[message.role]} message`} className={cn(yours && "rounded-2xl bg-secondary px-4 py-3")}>
        {!yours && <p className="mb-1 text-xs font-medium text-muted-foreground">{roleLabel[message.role]}</p>}
        <MessageBlocks blocks={message.content} />
        {message.status !== "completed" && <p className="mt-2 text-xs text-muted-foreground">{statusLabel[message.status]}</p>}
      </article>
    </li>
  );
}
