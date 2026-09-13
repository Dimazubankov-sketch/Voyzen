"use client";

import { useState } from "react";
import {
  RiAddLine,
  RiArrowLeftLine,
  RiCameraLine,
  RiEditLine,
  RiImageAddLine,
  RiLink,
  RiMapPin2Line,
  RiShareLine,
  RiVerifiedBadgeFill,
} from "@remixicon/react";
import { Avatar } from "@/components/ui/avatar";
import { useStore } from "@/lib/app-store";
import { useT } from "@/lib/settings-context";
import { useProfileNav } from "@/lib/profile-nav";
import { PEOPLE } from "@/lib/mock-data";
import type { VoyzenUser } from "@/lib/auth-context";
import { emailFor } from "@/lib/accounts";
import { cx } from "@/utils/cx";
import { PostCard, compact } from "./post-card";
import { EditProfileDialog } from "./edit-profile";
import { PostComposerDialog } from "./post-composer";
import { ShareSheet } from "./share-sheet";

type ContentTab = "posts" | "reposts";
type PeopleTab = "following" | "followers";

export function Profile({ user, onBack }: { user: VoyzenUser; onBack: () => void }) {
  const t = useT();
  const { myPosts, repostedPosts, isFollowing } = useStore();
  const [tab, setTab] = useState<ContentTab>("posts");
  const [people, setPeople] = useState<PeopleTab | null>(null);
  const [editing, setEditing] = useState(false);
  const [composing, setComposing] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shown = tab === "posts" ? myPosts : repostedPosts;

  // Real follow graph: the "Following" list is who you actually follow, and a
  // brand-new account (nobody followed, 0 followers) shows empty lists.
  const followingList = PEOPLE.filter((p) => isFollowing(p.id));
  const followersList = user.followers > 0 ? PEOPLE : [];
  const websiteHref = user.website
    ? /^https?:\/\//i.test(user.website)
      ? user.website
      : `https://${user.website}`
    : undefined;

  return (
    <div className="relative h-full">
      <div className="scroll-clean flex h-full flex-col overflow-y-auto bg-canvas pb-6">
        {/* Banner */}
        <div className="relative h-40 w-full shrink-0 bg-gradient-to-br from-accent to-accent-strong">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={user.banner ?? "https://picsum.photos/id/1074/1200/400"}
            alt=""
            className="size-full object-cover"
          />
          <button
            onClick={onBack}
            aria-label={t("back")}
            className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/50"
          >
            <RiArrowLeftLine className="size-5" />
          </button>
          <button
            onClick={() => setEditing(true)}
            aria-label={t("cover")}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/35 px-3 py-2 text-xs font-medium text-white backdrop-blur transition hover:bg-black/50"
          >
            <RiImageAddLine className="size-4" />
            {t("cover")}
          </button>
        </div>

        <div className="bg-surface px-5 pb-4">
          {/* Avatar + actions */}
          <div className="-mt-10 flex items-end justify-between">
            <button
              onClick={() => setEditing(true)}
              aria-label={t("changePhoto")}
              className="group relative inline-flex rounded-full border-4 border-surface"
            >
              <Avatar src={user.avatar} name={user.name} size={80} />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 opacity-0 transition group-hover:opacity-100">
                <RiCameraLine className="size-6 text-white" />
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border-2 border-surface bg-accent text-white">
                <RiCameraLine className="size-3.5" />
              </span>
            </button>

            <div className="mb-1 flex gap-2">
              <OutlineButton icon={<RiShareLine className="size-4" />} onClick={() => setSharing(true)}>{t("share")}</OutlineButton>
              <OutlineButton icon={<RiEditLine className="size-4" />} onClick={() => setEditing(true)}>
                {t("edit")}
              </OutlineButton>
            </div>
          </div>

          {/* Identity */}
          <div className="mt-3">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-ink">{user.name}</h1>
              {user.verified && <RiVerifiedBadgeFill className="size-5 text-accent" />}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">{emailFor(user.handle)}</span>
              {user.premium && (
                <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                  Plus
                </span>
              )}
            </div>
          </div>

          {user.bio && (
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
              {user.bio}
            </p>
          )}

          {(user.location || user.website) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              {user.location && (
                <span className="flex items-center gap-1">
                  <RiMapPin2Line className="size-4" />
                  {user.location}
                </span>
              )}
              {websiteHref && (
                <a
                  href={websiteHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-accent transition hover:underline"
                >
                  <RiLink className="size-4" />
                  {user.website}
                </a>
              )}
            </div>
          )}

          {/* Following / Followers */}
          <div className="mt-4 flex gap-5">
            <button
              onClick={() => setPeople("following")}
              className="text-sm text-muted transition hover:underline"
            >
              <span className="font-bold text-ink">{compact(followingList.length)}</span> {t("following")}
            </button>
            <button
              onClick={() => setPeople("followers")}
              className="text-sm text-muted transition hover:underline"
            >
              <span className="font-bold text-ink">{compact(user.followers)}</span> {t("followers")}
            </button>
          </div>
        </div>

        {/* Posts / Reposts — no rule above or below, the active underline is enough */}
        <div className="sticky top-0 z-10 flex bg-surface/95 backdrop-blur">
          {(["posts", "reposts"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cx(
                "relative flex-1 py-3 text-sm font-semibold transition",
                tab === key ? "text-ink" : "text-muted hover:text-ink",
              )}
            >
              {t(key)}
              {tab === key && (
                <span className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-3 pb-24">
          {shown.length === 0 ? (
            <p className="py-14 text-center text-sm text-faint">
              {tab === "posts" ? t("noPosts") : t("noReposts")}
            </p>
          ) : (
            shown.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>

      {/* New post */}
      <button
        onClick={() => setComposing(true)}
        aria-label={t("newPost")}
        className="absolute bottom-5 right-5 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-float transition hover:bg-accent-strong active:scale-95"
      >
        <RiAddLine className="size-7" />
      </button>

      {people && (
        <PeoplePanel
          tab={people}
          following={followingList}
          followers={followersList}
          onTab={setPeople}
          onClose={() => setPeople(null)}
        />
      )}
      {editing && <EditProfileDialog user={user} onClose={() => setEditing(false)} />}
      {composing && <PostComposerDialog onClose={() => setComposing(false)} />}
      {sharing && <ShareSheet handle={user.handle} name={user.name} onClose={() => setSharing(false)} />}
    </div>
  );
}

/** Following / Followers lists, as two tabs over the same panel. */
function PeoplePanel({
  tab,
  following,
  followers,
  onTab,
  onClose,
}: {
  tab: PeopleTab;
  following: typeof PEOPLE;
  followers: typeof PEOPLE;
  onTab: (t: PeopleTab) => void;
  onClose: () => void;
}) {
  const t = useT();
  const { openPerson } = useProfileNav();
  const list = tab === "following" ? following : followers;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-surface animate-slide-in-left">
      <header className="flex shrink-0 items-center gap-2 border-b border-line px-2 py-2.5">
        <button
          onClick={onClose}
          aria-label={t("back")}
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-3"
        >
          <RiArrowLeftLine className="size-5" />
        </button>
        <h2 className="text-base font-bold text-ink">
          {tab === "following" ? t("following") : t("followers")}
        </h2>
      </header>

      <div className="flex shrink-0 border-b border-line">
        {(["following", "followers"] as const).map((key) => (
          <button
            key={key}
            onClick={() => onTab(key)}
            className={cx(
              "relative flex-1 py-3 text-sm font-semibold transition",
              tab === key ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            {t(key)}
            {tab === key && (
              <span className="absolute inset-x-6 bottom-0 h-1 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="scroll-clean min-h-0 flex-1 overflow-y-auto">
        {list.length === 0 ? (
          <p className="py-14 text-center text-sm text-faint">
            {tab === "following" ? t("noFollowing") : t("noFollowers")}
          </p>
        ) : (
          list.map((p) => (
            <button
              key={p.id}
              onClick={() => openPerson(p)}
              className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-surface-2/50"
            >
              <Avatar src={p.avatar} name={p.name} size={44} online={p.online} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="truncate text-xs text-muted">{emailFor(p.handle)}</p>
              </div>
              <span className="rounded-full border border-line px-3.5 py-1.5 text-sm font-medium text-ink">
                {tab === "following" ? t("following") : "Follow"}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function OutlineButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink transition hover:bg-surface-3"
    >
      {icon}
      {children}
    </button>
  );
}
