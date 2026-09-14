"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { RiAddLine, RiArrowLeftLine, RiSearchLine } from "@remixicon/react";
import { useStore, PEOPLE } from "@/lib/app-store";
import { useT } from "@/lib/settings-context";
import { PostCard } from "./post-card";
import { PostComposerDialog } from "./post-composer";
import { WhoToFollow } from "./who-to-follow";
import { Search } from "./search";

type FeedTab = "forYou" | "following";

/**
 * The feed owns the top of the screen: a For you / Following switch, plus a
 * search loupe in the corner that expands into the in-feed search. `leading` is
 * where the shell drops the avatar/menu button on small screens.
 */
export function Feed({ leading, openSearchSignal }: { leading?: ReactNode; openSearchSignal?: number }) {
  const { posts, isFollowing } = useStore();
  const t = useT();
  const [tab, setTab] = useState<FeedTab>("forYou");
  const [composing, setComposing] = useState(false);
  const [searching, setSearching] = useState(false);

  // The menu's "Search" entry opens the in-feed search via this signal.
  useEffect(() => {
    if (openSearchSignal) setSearching(true);
  }, [openSearchSignal]);

  const followsAnyone = PEOPLE.some((p) => isFollowing(p.id));

  const shown = useMemo(() => {
    if (tab === "forYou") return posts;
    // Following: my own posts plus posts by people I follow.
    return posts.filter((p) => {
      if (p.mine) return true;
      const person = PEOPLE.find((x) => x.handle === p.author.handle);
      return person ? isFollowing(person.id) : false;
    });
  }, [posts, tab, isFollowing]);

  // No follows yet → suggest people instead of an empty Following feed.
  const showSuggestions = tab === "following" && !followsAnyone;

  // Search takes over the whole surface; a back arrow (in the leading slot)
  // collapses it back to the feed.
  if (searching) {
    return (
      <Search
        leading={
          <button
            onClick={() => setSearching(false)}
            aria-label={t("back")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3"
          >
            <RiArrowLeftLine className="size-5" />
          </button>
        }
      />
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      <div className="scroll-clean min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain bg-canvas">
        {/* Header: avatar (mobile) + For you / Following + search loupe */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-canvas/90 px-3 py-2 backdrop-blur">
          {leading}
          <div className="flex flex-1 justify-center">
            <div className="flex gap-1 rounded-full bg-surface p-1 shadow-panel">
              {(["forYou", "following"] as const).map((key) => (
                <button key={key} onClick={() => setTab(key)} className={cxTab(tab === key)}>
                  {key === "forYou" ? t("forYou") : t("following")}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => setSearching(true)}
            aria-label={t("searchTab")}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3 hover:text-ink"
          >
            <RiSearchLine className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 p-3 pb-24">
          {showSuggestions ? (
            <WhoToFollow />
          ) : (
            <>
              {shown.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
              {shown.length === 0 ? (
                <p className="py-16 text-center text-sm text-faint">{t("nothingFound")}</p>
              ) : (
                <p className="py-8 text-center text-sm text-faint">{t("allCaughtUp")}</p>
              )}
            </>
          )}
        </div>
      </div>

      <button
        onClick={() => setComposing(true)}
        aria-label={t("newPost")}
        className="absolute bottom-5 right-5 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-float transition hover:bg-accent-strong active:scale-95"
      >
        <RiAddLine className="size-7" />
      </button>

      {composing && <PostComposerDialog onClose={() => setComposing(false)} />}
    </div>
  );
}

function cxTab(active: boolean) {
  return [
    "rounded-full px-5 py-1.5 text-sm font-semibold transition",
    active ? "bg-accent text-white" : "text-muted hover:text-ink",
  ].join(" ");
}
