"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  RiAddCircleFill,
  RiAddCircleLine,
  RiChat3Fill,
  RiChat3Line,
  RiHome5Fill,
  RiHome5Line,
} from "@remixicon/react";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/app-store";
import { useIsDesktop, useT } from "@/lib/settings-context";
import { useEdgeSwipe } from "@/lib/use-edge-swipe";
import { ProfileNavProvider } from "@/lib/profile-nav";
import type { Person } from "@/lib/mock-data";
import type { TranslationKey } from "@/lib/i18n";
import { cx } from "@/utils/cx";
import { AuthScreen } from "@/components/auth/auth-screen";
import { Feed } from "./feed";
import { ChatView } from "./chat";
import { PostComposerDialog } from "./post-composer";
import { DRAWER_WIDTH, SidebarDrawer, SidebarRail } from "./sidebar";
import { Profile } from "./profile";
import { PersonProfile } from "./person-profile";
import { History } from "./history";
import { Settings } from "./settings";
import { Premium } from "./premium";
import { Analytics } from "./analytics";
import { Monetization } from "./monetization";
import { CallOverlay, MinimizedCall, type CallKind, type CallSession } from "./call";

export type AppTab = "search" | "home" | "chat";
type Overlay = "profile" | "history" | "settings" | "premium" | "analytics" | "monetization" | null;

const NAV: {
  key: AppTab | "compose";
  labelKey: TranslationKey;
  line: React.ComponentType<{ className?: string }>;
  fill: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "home", labelKey: "home", line: RiHome5Line, fill: RiHome5Fill },
  { key: "compose", labelKey: "newPost", line: RiAddCircleLine, fill: RiAddCircleFill },
  { key: "chat", labelKey: "messages", line: RiChat3Line, fill: RiChat3Fill },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const { chats, openOrCreateDirect } = useStore();
  const t = useT();
  const isDesktop = useIsDesktop();

  const [tab, setTab] = useState<AppTab>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [person, setPerson] = useState<Person | null>(null);
  const [conversationOpen, setConversationOpen] = useState(false);
  const [call, setCall] = useState<CallSession | null>(null);
  const [callMinimized, setCallMinimized] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);
  const [composing, setComposing] = useState(false);
  const [feedSearch, setFeedSearch] = useState(0);
  const [openChat, setOpenChat] = useState<{ id: string; n: number } | null>(null);

  const messagePerson = useCallback(
    (p: Person) => {
      const id = openOrCreateDirect(p);
      setPerson(null);
      setTab("chat");
      setOpenChat((prev) => ({ id, n: (prev?.n ?? 0) + 1 }));
    },
    [openOrCreateDirect],
  );

  // Close the "add account" overlay once a different account becomes active.
  const addFromHandle = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (addingAccount && user && addFromHandle.current && user.handle !== addFromHandle.current) {
      setAddingAccount(false);
    }
  }, [addingAccount, user]);

  const onConversationChange = useCallback((open: boolean) => setConversationOpen(open), []);
  const startCall = useCallback((name: string, avatar: string | undefined, kind: CallKind) => {
    setCall({ name, avatar, kind, startedAt: Date.now() });
    setCallMinimized(false);
  }, []);
  const openPerson = useCallback((p: Person) => setPerson(p), []);

  const unreadChats = useMemo(() => chats.reduce((n, c) => n + c.unread, 0), [chats]);

  const swipe = useEdgeSwipe({
    enabled: !isDesktop && !overlay && !person && !conversationOpen && !(call && !callMinimized),
    open: sidebarOpen,
    setOpen: setSidebarOpen,
    width: DRAWER_WIDTH,
  });

  if (!user) return null;

  const sidebarProps = {
    user,
    tab,
    onNavigate: (next: AppTab) => {
      setOverlay(null);
      // Search now lives in the feed — the menu's Search opens it there.
      if (next === "search") {
        setTab("home");
        setFeedSearch((n) => n + 1);
        return;
      }
      setTab(next);
    },
    onOpenProfile: () => setOverlay("profile"),
    onOpenHistory: () => setOverlay("history"),
    onOpenSettings: () => setOverlay("settings"),
    onOpenPremium: () => setOverlay("premium"),
    onOpenAnalytics: () => setOverlay("analytics"),
    onOpenMonetization: () => setOverlay("monetization"),
    onSignOut: signOut,
    onAddAccount: () => {
      addFromHandle.current = user?.handle;
      setAddingAccount(true);
    },
    unread: { chat: unreadChats },
  };

  const avatarButton = !isDesktop ? (
    <button
      onClick={() => setSidebarOpen(true)}
      aria-label="Open menu"
      className="shrink-0 rounded-full transition hover:opacity-80"
    >
      <Avatar src={user.avatar} name={user.name} size={36} online />
    </button>
  ) : undefined;

  const showChrome = !conversationOpen || isDesktop;

  return (
    <ProfileNavProvider openPerson={openPerson}>
      {/* Desktop pins the rail to the left instead of centring the whole block. */}
      <div className={cx("flex h-dvh w-full bg-canvas", isDesktop ? "justify-start" : "justify-center")}>
        {isDesktop && (
          <div className="h-dvh">
            <SidebarRail {...sidebarProps} collapsed={railCollapsed} onToggleCollapsed={() => setRailCollapsed((v) => !v)} />
          </div>
        )}

        <div
          {...swipe.handlers}
          className={cx(
            "relative flex h-dvh w-full flex-col overflow-hidden bg-surface touch-pan-y",
            isDesktop ? "max-w-[1000px] flex-1" : "max-w-[460px] shadow-panel sm:border-x sm:border-line",
          )}
        >
          {/* Home & Search own their headers; Messages gets a simple bar. */}
          {tab === "chat" && showChrome && (
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-3">
              {avatarButton}
              <h1 className="text-base font-bold text-ink">{t("messages")}</h1>
            </header>
          )}

          <main className={cx("min-h-0 flex-1", tab === "chat" ? "flex flex-col" : "")}>
            {tab === "home" && <Feed leading={avatarButton} openSearchSignal={feedSearch} />}
            {tab === "chat" && (
              <ChatView
                onConversationChange={onConversationChange}
                onStartCall={startCall}
                onOpenPerson={openPerson}
                openChat={openChat}
              />
            )}
          </main>

          {/* Bottom nav — mobile only */}
          {!isDesktop && showChrome && (
            <nav className="flex h-16 shrink-0 items-center justify-around border-t border-line bg-surface px-2 pb-[env(safe-area-inset-bottom)]">
              {NAV.map((item) => {
                const active = item.key !== "compose" && tab === item.key;
                const Icon = active ? item.fill : item.line;
                const badge = item.key === "chat" ? unreadChats : 0;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      if (item.key === "compose") {
                        setComposing(true);
                        return;
                      }
                      setTab(item.key);
                      setOverlay(null);
                    }}
                    aria-current={active ? "page" : undefined}
                    aria-label={t(item.labelKey)}
                    className="relative flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-transform active:scale-90"
                  >
                    <span className="relative">
                      <Icon
                        className={cx(
                          "size-6 transition-[color,transform] duration-200",
                          active ? "scale-110 text-accent" : "text-faint",
                        )}
                      />
                      {badge > 0 && (
                        <span className="absolute -right-2 -top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span className={cx("text-[11px] font-medium transition", active ? "text-accent" : "text-faint")}>
                      {t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* Mobile drawer */}
          {!isDesktop && (
            <SidebarDrawer {...sidebarProps} open={sidebarOpen} onClose={() => setSidebarOpen(false)} progress={swipe.progress} dragging={swipe.dragging} />
          )}

          {/* Full-surface overlays */}
          {overlay === "profile" && (
            <div className="absolute inset-0 z-50 bg-surface animate-slide-in-left">
              <Profile user={user} onBack={() => setOverlay(null)} />
            </div>
          )}
          {overlay === "history" && (
            <div className="absolute inset-0 z-50 bg-surface animate-slide-in-left">
              <History onBack={() => setOverlay(null)} />
            </div>
          )}
          {overlay === "settings" && (
            <div className="absolute inset-0 z-50 bg-surface animate-slide-in-left">
              <Settings onBack={() => setOverlay(null)} />
            </div>
          )}
          {overlay === "premium" && (
            <div className="absolute inset-0 z-50 bg-surface animate-slide-in-left">
              <Premium onBack={() => setOverlay(null)} />
            </div>
          )}
          {overlay === "analytics" && (
            <div className="absolute inset-0 z-50 bg-surface animate-slide-in-left">
              <Analytics onBack={() => setOverlay(null)} onOpenPremium={() => setOverlay("premium")} />
            </div>
          )}
          {overlay === "monetization" && (
            <div className="absolute inset-0 z-50 bg-surface animate-slide-in-left">
              <Monetization onBack={() => setOverlay(null)} onOpenPremium={() => setOverlay("premium")} />
            </div>
          )}
          {person && (
            <div className="absolute inset-0 z-[52] bg-surface animate-slide-in-left">
              <PersonProfile person={person} onBack={() => setPerson(null)} onMessage={messagePerson} />
            </div>
          )}

          {composing && <PostComposerDialog onClose={() => setComposing(false)} />}

          {/* Add-account: the auth screen over the app, cancelable via its back arrow */}
          {addingAccount && (
            <div className="absolute inset-0 z-[70] bg-canvas animate-slide-in-left">
              <AuthScreen mode="signup" onBack={() => setAddingAccount(false)} />
            </div>
          )}

          {call && callMinimized && (
            <MinimizedCall session={call} onRestore={() => setCallMinimized(false)} onEnd={() => setCall(null)} />
          )}
          {call && !callMinimized && (
            <CallOverlay session={call} onEnd={() => setCall(null)} onMinimize={() => setCallMinimized(true)} />
          )}
        </div>
      </div>
    </ProfileNavProvider>
  );
}
