"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CHATS,
  PEOPLE,
  POSTS,
  type Chat,
  type ChatMessage,
  type Person,
  type Poll,
  type Post,
  type PostComment,
} from "./mock-data";
import { useAuth, type VoyzenUser } from "./auth-context";
import { uid } from "@/utils/uid";

/** What a new post can carry beyond its text. */
export interface NewPostInput {
  text: string;
  images?: string[];
  poll?: Poll;
  location?: string;
  /** Set for a quote-repost. */
  repostOf?: Post;
  /** Marked as a paid promotion. */
  ad?: boolean;
}

/** Per-chat toggles that live outside the message list. */
export interface ChatSettings {
  screenshots: boolean;
  forwarding: boolean;
  /** Disappearing TTL in seconds; 0 = off. */
  disappearing: number;
}

const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  screenshots: false,
  forwarding: false,
  disappearing: 0,
};

/** Nobody is followed to start with — the Following tab then suggests people. */
const INITIAL_FOLLOWED: string[] = [];

interface AppStore {
  posts: Post[];
  likedPosts: Post[];
  myPosts: Post[];
  repostedPosts: Post[];
  toggleLike: (id: string) => void;
  toggleRepost: (id: string) => void;
  /** Quote-repost: a new post that embeds `original`. */
  repost: (original: Post, text: string) => void;
  hidePost: (id: string) => void;
  editPost: (id: string, text: string) => void;
  deletePost: (id: string) => void;
  addComment: (postId: string, comment: PostComment, parentId?: string) => void;
  toggleCommentLike: (postId: string, commentId: string) => void;
  votePoll: (postId: string, optionId: string) => void;
  addPost: (input: NewPostInput) => void;

  /** Which people the user follows. */
  isFollowing: (personId: string) => boolean;
  toggleFollow: (personId: string) => void;

  chats: Chat[];
  appendMessage: (chatId: string, message: ChatMessage) => void;
  editMessage: (chatId: string, messageId: string, text: string) => void;
  deleteMessages: (chatId: string, messageIds: string[], scope: "me" | "everyone") => void;
  deleteSelected: (chatId: string, keys: string[], scope: "me" | "everyone") => void;
  forwardMessage: (message: ChatMessage, toChatId: string) => void;
  clearHistory: (chatId: string) => void;
  markChatRead: (chatId: string) => void;
  markUnread: (chatId: string) => void;
  createGroup: (name: string, members: Person[]) => Chat;

  chatSettings: (chatId: string) => ChatSettings;
  setChatSetting: <K extends keyof ChatSettings>(chatId: string, key: K, value: ChatSettings[K]) => void;
  isBlocked: (chatId: string) => boolean;
  toggleBlock: (chatId: string) => void;
  togglePinChat: (chatId: string) => void;
  toggleMuteChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  pinMessage: (chatId: string, messageId: string | undefined) => void;
}

const StoreContext = createContext<AppStore | null>(null);

/** Apply `fn` to the comment with `id`, looking inside replies too. */
function mapComment(
  comments: PostComment[],
  id: string,
  fn: (c: PostComment) => PostComment,
): PostComment[] {
  return comments.map((c) => {
    if (c.id === id) return fn(c);
    if (c.replies?.length) return { ...c, replies: mapComment(c.replies, id, fn) };
    return c;
  });
}

/** Everything we persist for one account, so a reload restores their world. */
interface PersistedState {
  posts: Post[];
  chats: Chat[];
  followed: string[];
  settings: Record<string, ChatSettings>;
  blocked: Record<string, boolean>;
}

const storeKey = (handle: string) => `voyzen.store.${handle}`;

function loadState(handle: string | null): PersistedState | null {
  if (!handle) return null;
  try {
    const raw = window.localStorage.getItem(storeKey(handle));
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function saveState(handle: string, state: PersistedState) {
  try {
    window.localStorage.setItem(storeKey(handle), JSON.stringify(state));
  } catch {
    /* ignore quota / unavailable storage */
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Keyed by handle: switching accounts remounts the store so each one loads
  // its own persisted state cleanly instead of leaking the previous account's.
  return (
    <StoreInner key={user?.handle ?? "anon"} handle={user?.handle ?? null} user={user}>
      {children}
    </StoreInner>
  );
}

function StoreInner({
  handle,
  user,
  children,
}: {
  handle: string | null;
  user: VoyzenUser | null;
  children: ReactNode;
}) {
  // `handle` is fixed for this mount, so this reads storage exactly once.
  const saved = useMemo(() => loadState(handle), [handle]);
  const [posts, setPosts] = useState<Post[]>(() => saved?.posts ?? POSTS);
  const [chats, setChats] = useState<Chat[]>(() => saved?.chats ?? CHATS);
  const [followed, setFollowed] = useState<Set<string>>(
    () => new Set(saved?.followed ?? INITIAL_FOLLOWED),
  );
  const [settings, setSettings] = useState<Record<string, ChatSettings>>(() => saved?.settings ?? {});
  const [blocked, setBlocked] = useState<Record<string, boolean>>(() => saved?.blocked ?? {});

  // Persist this account's world whenever it changes.
  useEffect(() => {
    if (!handle) return;
    saveState(handle, { posts, chats, followed: [...followed], settings, blocked });
  }, [handle, posts, chats, followed, settings, blocked]);

  // Sweep out expired disappearing messages once a second.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setChats((prev) => {
        let changed = false;
        const next = prev.map((c) => {
          const kept = c.messages.filter((m) => !m.expiresAt || m.expiresAt > now);
          if (kept.length !== c.messages.length) {
            changed = true;
            return { ...c, messages: kept };
          }
          return c;
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleLike = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p,
      ),
    );
  }, []);

  const toggleRepost = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, reposted: !p.reposted, shares: p.shares + (p.reposted ? -1 : 1) }
          : p,
      ),
    );
  }, []);

  const hidePost = useCallback((id: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, hidden: true } : p)));
  }, []);

  const editPost = useCallback((id: string, text: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, text } : p)));
  }, []);

  const deletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addComment = useCallback((postId: string, comment: PostComment, parentId?: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        if (!parentId) return { ...p, comments: [...p.comments, comment] };
        return {
          ...p,
          comments: mapComment(p.comments, parentId, (c) => ({
            ...c,
            replies: [...(c.replies ?? []), comment],
          })),
        };
      }),
    );
  }, []);

  const toggleCommentLike = useCallback((postId: string, commentId: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              comments: mapComment(p.comments, commentId, (c) => ({
                ...c,
                liked: !c.liked,
                likes: c.likes + (c.liked ? -1 : 1),
              })),
            }
          : p,
      ),
    );
  }, []);

  const votePoll = useCallback((postId: string, optionId: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId || !p.poll) return p;
        const previous = p.poll.votedId;
        // Voting the option you already picked retracts the vote.
        if (previous === optionId) {
          return {
            ...p,
            poll: {
              ...p.poll,
              votedId: undefined,
              options: p.poll.options.map((o) =>
                o.id === optionId ? { ...o, votes: Math.max(0, o.votes - 1) } : o,
              ),
            },
          };
        }
        return {
          ...p,
          poll: {
            ...p.poll,
            votedId: optionId,
            options: p.poll.options.map((o) => {
              if (o.id === optionId) return { ...o, votes: o.votes + 1 };
              if (o.id === previous) return { ...o, votes: Math.max(0, o.votes - 1) };
              return o;
            }),
          },
        };
      }),
    );
  }, []);

  const meAuthor = useCallback((): Person => {
    return {
      id: "me",
      name: user?.name ?? "You",
      handle: user?.handle ?? "you",
      avatar: user?.avatar ?? "",
      verified: user?.verified,
    };
  }, [user]);

  const addPost = useCallback(
    ({ text, images, poll, location, repostOf, ad }: NewPostInput) => {
      if (!user) return;
      const post: Post = {
        id: uid("p"),
        author: meAuthor(),
        time: new Date().toLocaleString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        location,
        text,
        images,
        poll,
        repostOf,
        ad,
        likes: 0,
        likers: [],
        comments: [],
        shares: 0,
        views: 0,
        mine: true,
      };
      setPosts((prev) => [post, ...prev]);
    },
    [meAuthor, user],
  );

  const repost = useCallback(
    (original: Post, text: string) => {
      // You can't repost your own post onto your own page.
      if (original.mine) return;
      // Bump the original's share count and add a quote post to the top.
      setPosts((prev) => prev.map((p) => (p.id === original.id ? { ...p, shares: p.shares + 1, reposted: true } : p)));
      addPost({ text, repostOf: { ...original, repostOf: undefined } });
    },
    [addPost],
  );

  const isFollowing = useCallback((personId: string) => followed.has(personId), [followed]);
  const toggleFollow = useCallback((personId: string) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      if (next.has(personId)) next.delete(personId);
      else next.add(personId);
      return next;
    });
  }, []);

  const appendMessage = useCallback((chatId: string, message: ChatMessage) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, message] } : c)),
    );
  }, []);

  const editMessage = useCallback((chatId: string, messageId: string, text: string) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, text, edited: true } : m,
              ),
            }
          : c,
      ),
    );
  }, []);

  const deleteMessages = useCallback(
    (chatId: string, messageIds: string[], _scope: "me" | "everyone") => {
      // Without a backend both scopes remove the message locally.
      const ids = new Set(messageIds);
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId
            ? { ...c, messages: c.messages.filter((m) => !ids.has(m.id)) }
            : c,
        ),
      );
    },
    [],
  );

  // Delete a mix of whole messages (`msgId`) and single photos (`msgId:index`).
  // A message loses just the selected photos unless it's fully selected or has
  // nothing left to show, in which case the whole message goes.
  const deleteSelected = useCallback((chatId: string, keys: string[], _scope: "me" | "everyone") => {
    const whole = new Set<string>();
    const photos = new Map<string, Set<number>>();
    for (const key of keys) {
      const [id, idx] = key.split(":");
      if (idx === undefined) whole.add(id);
      else {
        if (!photos.has(id)) photos.set(id, new Set());
        photos.get(id)!.add(Number(idx));
      }
    }
    setChats((prev) =>
      prev.map((c) => {
        if (c.id !== chatId) return c;
        const next: ChatMessage[] = [];
        for (const m of c.messages) {
          if (whole.has(m.id)) continue;
          const idxs = photos.get(m.id);
          if (!idxs || !m.images) {
            next.push(m);
            continue;
          }
          const kept = m.images.filter((_, i) => !idxs.has(i));
          // Nothing left to show → drop the message entirely.
          if (kept.length === 0 && !m.text && !m.file && !m.audio && !m.video) continue;
          next.push({ ...m, images: kept.length ? kept : undefined });
        }
        return { ...c, messages: next };
      }),
    );
  }, []);

  const forwardMessage = useCallback((message: ChatMessage, toChatId: string) => {
    const fromName = chats.find((c) =>
      c.messages.some((m) => m.id === message.id),
    );
    const label = fromName
      ? fromName.kind === "group"
        ? fromName.name
        : fromName.person?.name
      : undefined;
    setChats((prev) =>
      prev.map((c) =>
        c.id === toChatId
          ? {
              ...c,
              messages: [
                ...c.messages,
                {
                  ...message,
                  id: uid("s"),
                  from: "me",
                  authorId: undefined,
                  read: false,
                  edited: false,
                  expiresAt: undefined,
                  forwardedFrom: label && label !== "You" ? label : message.forwardedFrom,
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                },
              ],
            }
          : c,
      ),
    );
  }, [chats]);

  const clearHistory = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId ? { ...c, messages: [], unread: 0 } : c)),
    );
  }, []);

  const markChatRead = useCallback((chatId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.id === chatId && c.unread > 0 ? { ...c, unread: 0 } : c)),
    );
  }, []);

  const markUnread = useCallback((chatId: string) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, unread: Math.max(1, c.unread) } : c)));
  }, []);

  const createGroup = useCallback((name: string, members: Person[]) => {
    const chat: Chat = {
      id: uid("g"),
      kind: "group",
      name,
      members,
      unread: 0,
      messages: [
        {
          id: "m0",
          from: "me",
          text: `You created the group “${name}”.`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          read: true,
        },
      ],
    };
    setChats((prev) => [chat, ...prev]);
    return chat;
  }, []);

  const chatSettings = useCallback(
    (chatId: string) => settings[chatId] ?? DEFAULT_CHAT_SETTINGS,
    [settings],
  );
  const setChatSetting = useCallback(
    <K extends keyof ChatSettings>(chatId: string, key: K, value: ChatSettings[K]) => {
      setSettings((prev) => ({
        ...prev,
        [chatId]: { ...DEFAULT_CHAT_SETTINGS, ...prev[chatId], [key]: value },
      }));
    },
    [],
  );

  const isBlocked = useCallback((chatId: string) => !!blocked[chatId], [blocked]);
  const toggleBlock = useCallback((chatId: string) => {
    setBlocked((prev) => ({ ...prev, [chatId]: !prev[chatId] }));
  }, []);

  const togglePinChat = useCallback((chatId: string) => {
    // Plus lifts the pin limit from 5 to 10.
    const limit = user?.premium ? 10 : 5;
    setChats((prev) => {
      const target = prev.find((c) => c.id === chatId);
      if (target && !target.pinned && prev.filter((c) => c.pinned).length >= limit) return prev;
      return prev.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c));
    });
  }, [user?.premium]);

  const toggleMuteChat = useCallback((chatId: string) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, muted: !c.muted } : c)));
  }, []);

  // Removing a chat hides it from the list but keeps its messages, so it comes
  // back intact if the conversation is reopened.
  const deleteChat = useCallback((chatId: string) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, deleted: true, unread: 0 } : c)));
  }, []);

  const pinMessage = useCallback((chatId: string, messageId: string | undefined) => {
    setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinnedMessageId: messageId } : c)));
  }, []);

  const visiblePosts = useMemo(() => posts.filter((p) => !p.hidden), [posts]);
  const likedPosts = useMemo(() => visiblePosts.filter((p) => p.liked), [visiblePosts]);
  const myPosts = useMemo(() => visiblePosts.filter((p) => p.mine), [visiblePosts]);
  const repostedPosts = useMemo(() => visiblePosts.filter((p) => p.reposted), [visiblePosts]);

  // Hide deleted chats and float pinned ones to the top (stable otherwise).
  const visibleChats = useMemo(() => {
    const shown = chats.filter((c) => !c.deleted);
    return [...shown].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  }, [chats]);

  const value = useMemo(
    () => ({
      posts: visiblePosts,
      likedPosts,
      myPosts,
      repostedPosts,
      toggleLike,
      toggleRepost,
      repost,
      hidePost,
      addComment,
      toggleCommentLike,
      votePoll,
      addPost,
      editPost,
      deletePost,
      isFollowing,
      toggleFollow,
      chats: visibleChats,
      appendMessage,
      editMessage,
      deleteMessages,
      deleteSelected,
      forwardMessage,
      clearHistory,
      markChatRead,
      markUnread,
      createGroup,
      chatSettings,
      setChatSetting,
      isBlocked,
      toggleBlock,
      togglePinChat,
      toggleMuteChat,
      deleteChat,
      pinMessage,
    }),
    [
      visiblePosts,
      likedPosts,
      myPosts,
      repostedPosts,
      toggleLike,
      toggleRepost,
      repost,
      hidePost,
      addComment,
      toggleCommentLike,
      votePoll,
      addPost,
      editPost,
      deletePost,
      isFollowing,
      toggleFollow,
      visibleChats,
      appendMessage,
      editMessage,
      deleteMessages,
      deleteSelected,
      forwardMessage,
      clearHistory,
      markChatRead,
      markUnread,
      createGroup,
      chatSettings,
      setChatSetting,
      isBlocked,
      toggleBlock,
      togglePinChat,
      toggleMuteChat,
      deleteChat,
      pinMessage,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <AppStoreProvider>");
  return ctx;
}

/** Everyone the app knows about — used by the search screen. */
export { PEOPLE };
