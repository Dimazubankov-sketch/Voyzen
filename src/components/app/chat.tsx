"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RiAddLine,
  RiArrowLeftLine,
  RiArrowUpLine,
  RiCheckDoubleLine,
  RiCheckLine,
  RiCloseLine,
  RiDeleteBin6Line,
  RiFileTextLine,
  RiImageLine,
  RiLock2Line,
  RiMicLine,
  RiMoreLine,
  RiPencilLine,
  RiPushpin2Fill,
  RiVolumeMuteFill,
  RiPhoneLine,
  RiRecordCircleLine,
  RiSearchLine,
  RiSendPlane2Fill,
  RiShareForwardLine,
  RiVideoOnLine,
} from "@remixicon/react";
import { Avatar } from "@/components/ui/avatar";
import { MediaViewer } from "@/components/ui/media-viewer";
import { useStore } from "@/lib/app-store";
import { useIsDesktop, useSettings, useT } from "@/lib/settings-context";
import {
  chatAvatar,
  chatOnline,
  chatTitle,
  PEOPLE,
  type Chat,
  type ChatMessage,
  type Person,
} from "@/lib/mock-data";
import { filesToDataUrls, formatBytes, readVideoDuration } from "@/utils/image";
import { cx } from "@/utils/cx";
import { uid } from "@/utils/uid";
import { NewGroupDialog } from "./new-group-dialog";
import { ChatInfo } from "./chat-info";
import { BubbleBody, bubbleShellClass } from "./chat-bubble";
import { ChatListMenu, ChatMoreSheet, ForwardPicker, MessageActionMenu } from "./chat-sheets";
import {
  LevelMeter,
  formatTime,
  useMediaRecorder,
  type RecordKind,
  type RecordingResult,
} from "./voice";
import type { CallKind } from "./call";

/** Avatar for a chat row: one photo for DMs, a collage for groups. */
export function ChatAvatar({ chat, size = 52 }: { chat: Chat; size?: number }) {
  const src = chatAvatar(chat);
  if (chat.kind === "direct" || src) {
    return <Avatar src={src} name={chatTitle(chat)} size={size} online={chatOnline(chat)} />;
  }
  const members = (chat.members ?? []).slice(0, 4);
  return (
    <span
      className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-full bg-surface-2"
      style={{ width: size, height: size }}
    >
      {members.map((m) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={m.id} src={m.avatar} alt="" className="size-full object-cover" />
      ))}
    </span>
  );
}

/** A single chat-list row. Long-press or right-click opens its context menu. */
function ChatRow({
  chat,
  preview,
  lastTime,
  mine,
  active,
  onOpen,
  onMenu,
}: {
  chat: Chat;
  preview: string;
  lastTime?: string;
  mine: boolean;
  active: boolean;
  onOpen: () => void;
  onMenu: (rect: DOMRect) => void;
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    held.current = false;
    const rect = e.currentTarget.getBoundingClientRect();
    holdTimer.current = setTimeout(() => {
      held.current = true;
      onMenu(rect);
    }, 450);
  };
  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  return (
    <button
      onClick={() => {
        if (held.current) return;
        onOpen();
      }}
      onPointerDown={onPointerDown}
      onPointerUp={clearHold}
      onPointerLeave={clearHold}
      onContextMenu={(e) => {
        e.preventDefault();
        onMenu(e.currentTarget.getBoundingClientRect());
      }}
      className={cx(
        "flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-surface-2/50",
        active && "bg-surface-2",
      )}
    >
      <ChatAvatar chat={chat} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink">{chatTitle(chat)}</span>
            {chat.muted && <RiVolumeMuteFill className="size-3.5 shrink-0 text-faint" />}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-faint">
            {chat.pinned && <RiPushpin2Fill className="size-3.5 text-muted" />}
            {lastTime}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {mine && <RiCheckDoubleLine className="size-4 shrink-0 text-accent" />}
          <span className="truncate text-sm text-muted">{preview}</span>
          {chat.unread > 0 && (
            <span className={cx(
              "ml-auto flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
              chat.muted ? "bg-faint" : "bg-accent",
            )}>
              {chat.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function ChatView({
  onConversationChange,
  onStartCall,
  onOpenPerson,
}: {
  onConversationChange?: (open: boolean) => void;
  onStartCall?: (name: string, avatar: string | undefined, kind: CallKind) => void;
  onOpenPerson?: (person: Person) => void;
}) {
  const t = useT();
  const isDesktop = useIsDesktop();
  const { chats, appendMessage, createGroup, markChatRead, chatSettings, togglePinChat, toggleMuteChat, deleteChat, markUnread } = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [newGroup, setNewGroup] = useState(false);
  const [chatMenu, setChatMenu] = useState<{ chat: Chat; rect: DOMRect } | null>(null);

  const active = chats.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    onConversationChange?.(active !== null);
  }, [active, onConversationChange]);

  useEffect(() => {
    if (activeId) markChatRead(activeId);
  }, [activeId, markChatRead]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chats;
    return chats.filter(
      (c) =>
        chatTitle(c).toLowerCase().includes(q) ||
        c.messages.at(-1)?.text?.toLowerCase().includes(q),
    );
  }, [chats, query]);

  const send = (partial: Omit<ChatMessage, "id" | "from" | "time">) => {
    if (!active) return;
    const s = chatSettings(active.id);
    appendMessage(active.id, {
      id: uid("s"),
      from: "me",
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: false,
      expiresAt: s.disappearing > 0 ? Date.now() + s.disappearing * 1000 : undefined,
      ...partial,
    });
  };

  const onCreateGroup = (name: string, members: Person[]) => {
    const chat = createGroup(name, members);
    setNewGroup(false);
    setActiveId(chat.id);
  };

  return (
    <div className="relative flex h-full">
      {/* Chat list */}
      <div
        className={cx(
          "relative min-h-0 flex-col",
          isDesktop
            ? "flex w-[340px] shrink-0 border-r border-line"
            : active
              ? "hidden"
              : "flex w-full",
        )}
      >
        <div className="shrink-0 bg-surface px-4 pb-2 pt-1">
          <div className="flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2.5">
            <RiSearchLine className="size-5 shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchChats")}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
          </div>
        </div>

        <div className="scroll-clean min-h-0 flex-1 overflow-y-auto">
          {filtered.map((chat) => {
            const last = chat.messages.at(-1);
            const preview =
              last?.text ||
              (last?.images?.length
                ? `📷 ${t("photo")}`
                : last?.file
                  ? `📎 ${last.file.name}`
                  : last?.audio
                    ? `🎤 ${t("voiceMessage")}`
                    : last?.video
                      ? `📹 ${t("videoMessage")}`
                      : "");
            const mine = last?.from === "me";
            return (
              <ChatRow
                key={chat.id}
                chat={chat}
                preview={preview}
                lastTime={last?.time}
                mine={mine}
                active={isDesktop && activeId === chat.id}
                onOpen={() => setActiveId(chat.id)}
                onMenu={(rect) => setChatMenu({ chat, rect })}
              />
            );
          })}
          {filtered.length === 0 && (
            <p className="py-16 text-center text-sm text-faint">{t("noChats")}</p>
          )}
        </div>

        <button
          onClick={() => setNewGroup(true)}
          aria-label={t("newGroup")}
          className="absolute bottom-4 right-4 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-float transition hover:bg-accent-strong active:scale-95"
        >
          <RiPencilLine className="size-6" />
        </button>
      </div>

      {/* Conversation */}
      <div className={cx("min-w-0 flex-1", active || isDesktop ? "flex" : "hidden")}>
        {active ? (
          <Conversation
            key={active.id}
            chat={active}
            onBack={() => setActiveId(null)}
            onSend={send}
            onStartCall={onStartCall}
            onOpenPerson={onOpenPerson}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <span className="text-4xl">💬</span>
            <p className="text-sm text-muted">{t("messages")}</p>
          </div>
        )}
      </div>

      {newGroup && <NewGroupDialog onClose={() => setNewGroup(false)} onCreate={onCreateGroup} />}

      {chatMenu && (
        <ChatListMenu
          chat={chatMenu.chat}
          rect={chatMenu.rect}
          onClose={() => setChatMenu(null)}
          onPin={() => { togglePinChat(chatMenu.chat.id); setChatMenu(null); }}
          onMute={() => { toggleMuteChat(chatMenu.chat.id); setChatMenu(null); }}
          onMarkUnread={() => { markUnread(chatMenu.chat.id); setChatMenu(null); }}
          onDelete={() => {
            deleteChat(chatMenu.chat.id);
            if (activeId === chatMenu.chat.id) setActiveId(null);
            setChatMenu(null);
          }}
        />
      )}
    </div>
  );
}

function Conversation({
  chat,
  onBack,
  onSend,
  onStartCall,
  onOpenPerson,
}: {
  chat: Chat;
  onBack: () => void;
  onSend: (partial: Omit<ChatMessage, "id" | "from" | "time">) => void;
  onStartCall?: (name: string, avatar: string | undefined, kind: CallKind) => void;
  onOpenPerson?: (person: Person) => void;
}) {
  const t = useT();
  const isDesktop = useIsDesktop();
  const { chats, editMessage, deleteMessages, deleteSelected, forwardMessage, chatSettings, isBlocked, pinMessage } = useStore();
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<{ message: ChatMessage; rect: DOMRect } | null>(null);
  const [forwarding, setForwarding] = useState<ChatMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewer, setViewer] = useState<{ items: string[]; index: number } | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  // Leaving nothing selected drops back out of select mode.
  useEffect(() => {
    if (selectMode && selected.size === 0) setSelectMode(false);
  }, [selectMode, selected]);

  // The selectable "elements" of a message: each photo of an image message, or
  // the message itself otherwise.
  const elementKeys = useCallback((m: ChatMessage): string[] => {
    if (m.images && m.images.length > 0) return m.images.map((_, i) => `${m.id}:${i}`);
    return [m.id];
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const acceptRef = useRef<string>("");

  const settings = chatSettings(chat.id);
  const blocked = chat.kind === "direct" && isBlocked(chat.id);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [chat.messages.length]);

  const replyPreview = (m: ChatMessage) => {
    const author = m.from === "me" ? t("you") : (chat.kind === "group" ? PEOPLE.find((p) => p.id === m.authorId)?.name : chatTitle(chat)) ?? undefined;
    const text = m.text || (m.images?.length ? `📷 ${t("photo")}` : m.audio ? `🎤 ${t("voiceMessage")}` : m.video ? `📹 ${t("videoMessage")}` : m.file ? `📎 ${m.file.name}` : "");
    return { author, text };
  };

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    if (editingId) {
      editMessage(chat.id, editingId, text);
      setEditingId(null);
    } else {
      onSend({ text, replyTo: replyingTo ? replyPreview(replyingTo) : undefined });
      setReplyingTo(null);
    }
    setDraft("");
  };

  const scrollToMessage = (id: string) => {
    const el = scrollRef.current?.querySelector(`[data-msg="${id}"]`) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-accent");
      setTimeout(() => el.classList.remove("ring-2", "ring-accent"), 1200);
    }
  };

  const openPicker = (accept: string) => {
    acceptRef.current = accept;
    setAttachOpen(false);
    requestAnimationFrame(() => fileRef.current?.click());
  };

  const onFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list);
    const images = files.filter((f) => f.type.startsWith("image/"));
    const videos = files.filter((f) => f.type.startsWith("video/"));
    const others = files.filter((f) => !f.type.startsWith("image/") && !f.type.startsWith("video/"));

    // Photos become data URLs so they survive a reload; up to 10 per message,
    // extras spill into further messages.
    for (let i = 0; i < images.length; i += 10) {
      const batch = await filesToDataUrls(images.slice(i, i + 10));
      onSend({ images: batch });
    }
    videos.forEach((f) => {
      const url = URL.createObjectURL(f);
      void readVideoDuration(url).then((duration) => onSend({ video: { url, duration } }));
    });
    others.forEach((f) =>
      onSend({ file: { name: f.name, size: formatBytes(f.size), url: URL.createObjectURL(f) } }),
    );
    if (fileRef.current) fileRef.current.value = "";
  };

  const onRecorded = useCallback(
    (result: RecordingResult) => {
      if (result.kind === "video") onSend({ video: { url: result.url, duration: result.duration } });
      else onSend({ audio: { url: result.url, duration: result.duration, peaks: result.peaks } });
    },
    [onSend],
  );

  const startEdit = (m: ChatMessage) => {
    setDraft(m.text ?? "");
    setEditingId(m.id);
    setReplyingTo(null);
    setMenuFor(null);
  };

  const toggleSelect = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  // Enter select mode from the message menu. `all` picks every element of the
  // message (all photos); otherwise just the first element.
  const startSelect = (m: ChatMessage, all: boolean) => {
    const keys = elementKeys(m);
    setSelected(new Set(all ? keys : [keys[0]]));
    setSelectMode(true);
    setMenuFor(null);
  };

  const person = chat.kind === "direct" ? chat.person : undefined;
  const subtitle =
    chat.kind === "group"
      ? `${(chat.members?.length ?? 0) + 1} ${t("members")}`
      : chatOnline(chat)
        ? t("online")
        : t("lastSeen");

  return (
    <div className="flex h-full w-full flex-col">
      {/* Header — normal, or the select-mode bar */}
      {selectMode ? (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2">
          <button
            onClick={() => {
              setSelectMode(false);
              setSelected(new Set());
            }}
            aria-label={t("cancel")}
            className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-3"
          >
            <RiCloseLine className="size-5" />
          </button>
          <span className="flex-1 text-sm font-semibold text-ink">
            {selected.size} {t("selected")}
          </span>
          <button
            onClick={() => {
              deleteSelected(chat.id, [...selected], "me");
              setSelectMode(false);
              setSelected(new Set());
            }}
            disabled={selected.size === 0}
            className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10 disabled:opacity-40"
          >
            <RiDeleteBin6Line className="size-5" />
            {t("deleteSelected")}
          </button>
        </header>
      ) : (
        <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 py-2.5">
          {!isDesktop && (
            <button
              onClick={onBack}
              aria-label={t("back")}
              className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-3"
            >
              <RiArrowLeftLine className="size-5" />
            </button>
          )}
          <button
            onClick={() => setInfoOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <ChatAvatar chat={chat} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{chatTitle(chat)}</p>
              <p
                className={cx(
                  "truncate text-xs",
                  chat.kind === "direct" && chatOnline(chat) ? "text-online" : "text-muted",
                )}
              >
                {subtitle}
              </p>
            </div>
          </button>
          <HeaderIcon label={t("videoCall")} onClick={() => onStartCall?.(chatTitle(chat), chatAvatar(chat), "video")}>
            <RiVideoOnLine className="size-5" />
          </HeaderIcon>
          <HeaderIcon label={t("voiceCall")} onClick={() => onStartCall?.(chatTitle(chat), chatAvatar(chat), "audio")}>
            <RiPhoneLine className="size-5" />
          </HeaderIcon>
          <HeaderIcon label={t("menu")} onClick={() => setMoreOpen(true)}>
            <RiMoreLine className="size-5" />
          </HeaderIcon>
        </header>
      )}

      {/* Pinned message bar */}
      {!selectMode && chat.pinnedMessageId && (() => {
        const pinned = chat.messages.find((m) => m.id === chat.pinnedMessageId);
        if (!pinned) return null;
        const p = replyPreview(pinned);
        return (
          <button
            onClick={() => scrollToMessage(pinned.id)}
            className="flex shrink-0 items-center gap-2.5 border-b border-line bg-surface px-3 py-2 text-left"
          >
            <span className="h-8 w-0.5 shrink-0 rounded-full bg-accent" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-accent">{t("pinnedMessage")}</span>
              <span className="block truncate text-sm text-muted">{p.text}</span>
            </span>
            <span
              role="button"
              tabIndex={0}
              aria-label={t("unpinMessage")}
              onClick={(e) => { e.stopPropagation(); pinMessage(chat.id, undefined); }}
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3"
            >
              <RiCloseLine className="size-5" />
            </span>
          </button>
        );
      })()}

      {/* Messages */}
      <div
        ref={scrollRef}
        className={cx(
          "scroll-clean min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-4",
          settings.screenshots && "select-none",
        )}
      >
        {chat.messages.map((m) => (
          <Bubble
            key={m.id}
            message={m}
            isGroup={chat.kind === "group"}
            selectMode={selectMode}
            selectedKeys={selected}
            onToggleKey={toggleSelect}
            onMenu={(rect) => setMenuFor({ message: m, rect })}
            onOpenImages={(images, index) => setViewer({ items: images, index })}
          />
        ))}
        {chat.messages.length === 0 && (
          <p className="py-16 text-center text-sm text-faint">{t("noChats")}</p>
        )}
      </div>

      {/* Composer / blocked banner / editing banner */}
      <div className="relative shrink-0 border-t border-line bg-surface p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <input ref={fileRef} type="file" multiple hidden accept={acceptRef.current || undefined} onChange={(e) => void onFiles(e.target.files)} />

        {blocked ? (
          <p className="py-2 text-center text-sm text-muted">{t("userBlockedBanner")}</p>
        ) : selectMode ? null : (
          <>
            {editingId && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <RiPencilLine className="size-4 shrink-0 text-accent" />
                <span className="flex-1 text-xs font-medium text-accent">{t("editMessage")}</span>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setDraft("");
                  }}
                  aria-label={t("cancel")}
                  className="text-muted"
                >
                  <RiCloseLine className="size-4" />
                </button>
              </div>
            )}

            {replyingTo && !editingId && (
              <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2">
                <span className="h-8 w-0.5 shrink-0 rounded-full bg-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-accent">{t("reply")}</span>
                  <span className="block truncate text-xs text-muted">{replyPreview(replyingTo).text}</span>
                </span>
                <button onClick={() => setReplyingTo(null)} aria-label={t("cancel")} className="text-muted">
                  <RiCloseLine className="size-4" />
                </button>
              </div>
            )}

            {attachOpen && (
              <>
                <button aria-label={t("close")} onClick={() => setAttachOpen(false)} className="fixed inset-0 z-10 cursor-default" />
                <div className="absolute bottom-full left-3 z-20 mb-2 w-52 overflow-hidden rounded-2xl border border-line bg-surface shadow-float animate-pop-in">
                  <AttachOption icon={<RiImageLine className="size-5" />} label={t("photoOrVideo")} onClick={() => openPicker("image/*,video/*")} />
                  <AttachOption icon={<RiFileTextLine className="size-5" />} label={t("document")} onClick={() => openPicker("")} />
                </div>
              </>
            )}

            <Composer
              draft={draft}
              onDraft={setDraft}
              onSubmit={submit}
              onAttach={() => setAttachOpen((v) => !v)}
              attachOpen={attachOpen}
              editing={!!editingId}
              onRecorded={onRecorded}
            />
          </>
        )}
      </div>

      {/* Overlays */}
      {infoOpen && (
        <ChatInfo
          chat={chat}
          onBack={() => setInfoOpen(false)}
          onOpenPerson={(p) => {
            setInfoOpen(false);
            onOpenPerson?.(p);
          }}
          onStartCall={onStartCall}
        />
      )}

      {moreOpen && <ChatMoreSheet chat={chat} onClose={() => setMoreOpen(false)} onCleared={() => setMoreOpen(false)} />}

      {menuFor && (
        <MessageActionMenu
          message={menuFor.message}
          rect={menuFor.rect}
          mine={menuFor.message.from === "me"}
          isGroup={chat.kind === "group"}
          canEdit={menuFor.message.from === "me" && !!menuFor.message.text && !menuFor.message.audio && !menuFor.message.video}
          canForward={!settings.forwarding}
          elementCount={elementKeys(menuFor.message).length}
          pinned={chat.pinnedMessageId === menuFor.message.id}
          onClose={() => setMenuFor(null)}
          onReply={() => {
            setReplyingTo(menuFor.message);
            setEditingId(null);
            setMenuFor(null);
          }}
          onCopy={() => {
            if (menuFor.message.text) navigator.clipboard?.writeText(menuFor.message.text).catch(() => {});
            setMenuFor(null);
          }}
          onCopyLink={() => {
            const url = `${window.location.origin}${window.location.pathname}#msg-${menuFor.message.id}`;
            navigator.clipboard?.writeText(url).catch(() => {});
            setMenuFor(null);
          }}
          onPin={() => {
            pinMessage(chat.id, chat.pinnedMessageId === menuFor.message.id ? undefined : menuFor.message.id);
            setMenuFor(null);
          }}
          onEdit={() => startEdit(menuFor.message)}
          onForward={() => {
            setForwarding(menuFor.message);
            setMenuFor(null);
          }}
          onSelect={() => startSelect(menuFor.message, false)}
          onSelectAll={() => startSelect(menuFor.message, true)}
          onDelete={(scope) => {
            deleteMessages(chat.id, [menuFor.message.id], scope);
            setMenuFor(null);
          }}
        />
      )}

      {forwarding && (
        <ForwardPicker
          chats={chats}
          excludeId={chat.id}
          onClose={() => setForwarding(null)}
          onPick={(toChatId) => {
            forwardMessage(forwarding, toChatId);
            setForwarding(null);
          }}
        />
      )}

      {viewer && (
        <MediaViewer
          items={viewer.items.map((src) => ({ src, kind: "image" as const }))}
          index={viewer.index}
          onIndex={(i) => setViewer((v) => (v ? { ...v, index: i } : v))}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}

/**
 * Message box with a press-and-hold recorder. A tap flips voice/video, holding
 * records, and sliding up locks the recording so you can let go and keep going.
 */
function Composer({
  draft,
  onDraft,
  onSubmit,
  onAttach,
  attachOpen,
  editing,
  onRecorded,
}: {
  draft: string;
  onDraft: (v: string) => void;
  onSubmit: () => void;
  onAttach: () => void;
  attachOpen: boolean;
  editing: boolean;
  onRecorded: (result: RecordingResult) => void;
}) {
  const t = useT();
  const { toggles } = useSettings();
  const enterToSend = toggles.enterToSend;
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const { recording, seconds, error, stream, start, stop, cancel, setError } = useMediaRecorder(barsRef);

  const [mode, setMode] = useState<RecordKind>("audio");
  const [locked, setLocked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const press = useRef<{ y: number; started: boolean } | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const finish = useCallback(
    async (send: boolean) => {
      setLocked(false);
      if (!send) {
        await cancel();
        return;
      }
      const result = await stop();
      if (result && result.duration >= 0.6) onRecorded(result);
    },
    [cancel, onRecorded, stop],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (recording) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    press.current = { y: e.clientY, started: false };
    holdTimer.current = setTimeout(async () => {
      if (!press.current) return;
      press.current.started = true;
      const ok = await start(mode);
      if (!ok) press.current = null;
    }, 220);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!press.current?.started || locked) return;
    if (press.current.y - e.clientY > 60) setLocked(true);
  };

  const endPress = (send: boolean, cancelled = false) => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    const current = press.current;
    press.current = null;
    if (!current) return;
    if (!current.started) {
      if (!cancelled) setMode((m) => (m === "audio" ? "video" : "audio"));
      return;
    }
    if (locked) return;
    void finish(send);
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-3 py-2.5">
        <RiMicLine className="size-5 shrink-0 text-danger" />
        <p className="flex-1 text-xs text-muted">{error}</p>
        <button onClick={() => setError(null)} aria-label={t("close")} className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-3">
          <RiCloseLine className="size-5" />
        </button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex flex-col gap-2">
        {mode === "video" && (
          <div className="flex justify-center">
            <video ref={videoRef} autoPlay muted playsInline className="size-32 scale-x-[-1] rounded-full object-cover ring-2 ring-accent" />
          </div>
        )}
        <div className="flex items-center gap-2 rounded-2xl bg-surface-2 px-2 py-1.5">
          <button onClick={() => void finish(false)} aria-label={t("cancel")} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3 hover:text-danger">
            <RiCloseLine className="size-5" />
          </button>
          <span className="flex size-2 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden />
          <span className="w-11 shrink-0 font-mono text-xs text-muted">{formatTime(seconds)}</span>
          <LevelMeter barsRef={barsRef} />
          {locked ? (
            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent">
              <RiLock2Line className="size-4" />
              {t("locked")}
            </span>
          ) : (
            <span className="flex shrink-0 items-center gap-1 text-xs text-faint">
              <RiArrowUpLine className="size-4 animate-bounce" />
            </span>
          )}
          <button onClick={() => void finish(true)} aria-label="Send" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-strong">
            <RiSendPlane2Fill className="size-5" />
          </button>
        </div>
        {!locked && <p className="text-center text-[11px] text-faint">{t("holdToRecord")}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-end gap-1.5 rounded-2xl bg-surface-2 px-2 py-1.5">
      {!editing && (
        <ComposerIcon label={t("photoOrVideo")} onClick={onAttach} active={attachOpen}>
          <RiAddLine className="size-5" />
        </ComposerIcon>
      )}
      <textarea
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && enterToSend) {
            e.preventDefault();
            onSubmit();
          }
        }}
        rows={1}
        placeholder={t("message")}
        className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-faint"
      />
      {draft.trim() || editing ? (
        <button onClick={onSubmit} aria-label="Send" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white transition hover:bg-accent-strong">
          {editing ? <RiCheckLine className="size-5" /> : <RiSendPlane2Fill className="size-5" />}
        </button>
      ) : (
        <button
          type="button"
          aria-label={mode === "audio" ? t("toVideoMode") : t("toVoiceMode")}
          title={t("holdToRecord")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => endPress(true)}
          onPointerCancel={() => endPress(false, true)}
          className="flex size-9 shrink-0 touch-none select-none items-center justify-center rounded-full text-faint transition hover:bg-surface-3 hover:text-accent active:scale-110 active:text-accent"
        >
          {mode === "audio" ? <RiMicLine className="size-5" /> : <RiRecordCircleLine className="size-5" />}
        </button>
      )}
    </div>
  );
}

function AttachOption({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-3.5 py-3 text-left text-sm font-medium text-ink transition hover:bg-surface-2">
      <span className="text-accent">{icon}</span>
      {label}
    </button>
  );
}

function Bubble({
  message,
  isGroup,
  selectMode,
  selectedKeys,
  onToggleKey,
  onMenu,
  onOpenImages,
}: {
  message: ChatMessage;
  isGroup: boolean;
  selectMode: boolean;
  selectedKeys: Set<string>;
  onToggleKey: (key: string) => void;
  onMenu: (rect: DOMRect) => void;
  onOpenImages: (images: string[], index: number) => void;
}) {
  const t = useT();
  const mine = message.from === "me";
  const isImages = !!message.images?.length;
  // Image messages tick photos individually; everything else ticks as a whole.
  const selected = isImages
    ? message.images!.some((_, i) => selectedKeys.has(`${message.id}:${i}`))
    : selectedKeys.has(message.id);

  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (holdTimer.current) clearTimeout(holdTimer.current); }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (selectMode) return;
    if ((e.target as HTMLElement).closest("a")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    holdTimer.current = setTimeout(() => onMenu(rect), 450);
  };
  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  const toggleWhole = () => onToggleKey(message.id);

  return (
    <div data-msg={message.id} className={cx("flex items-center gap-2 rounded-2xl transition", mine ? "justify-end" : "justify-start")}>
      {selectMode && !isImages && (
        <button
          onClick={toggleWhole}
          aria-label={t("selectMessages")}
          className={cx(
            "flex size-5 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-accent bg-accent text-white" : "border-line bg-surface",
          )}
        >
          {selected && <RiCheckLine className="size-3.5" />}
        </button>
      )}

      <div
        onClick={selectMode && !isImages ? toggleWhole : undefined}
        onPointerDown={onPointerDown}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest("a")) return;
          e.preventDefault();
          onMenu(e.currentTarget.getBoundingClientRect());
        }}
        className={bubbleShellClass(message, mine, selectMode)}
      >
        <BubbleBody
          message={message}
          mine={mine}
          isGroup={isGroup}
          onOpenImages={onOpenImages}
          selectMode={selectMode}
          selectedKeys={selectedKeys}
          onToggleKey={onToggleKey}
        />
      </div>
    </div>
  );
}

function HeaderIcon({ label, onClick, children }: { label: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} onClick={onClick} className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3 hover:text-accent">
      {children}
    </button>
  );
}

function ComposerIcon({ label, onClick, active, children }: { label: string; onClick?: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx("flex size-9 shrink-0 items-center justify-center rounded-full transition", active ? "bg-accent text-white" : "text-faint hover:bg-surface-3 hover:text-accent")}
    >
      {children}
    </button>
  );
}
