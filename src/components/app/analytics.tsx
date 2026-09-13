"use client";

import { RiArrowLeftLine, RiBarChart2Line, RiChat1Line, RiEyeLine, RiHeart3Line, RiLockLine, RiRepeat2Line, RiVipCrown2Fill } from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/app-store";
import { useT } from "@/lib/settings-context";
import { compact } from "./post-card";
import { cx } from "@/utils/cx";
import type { PostComment } from "@/lib/mock-data";

function countComments(list: PostComment[]): number {
  return list.reduce((n, c) => n + 1 + countComments(c.replies ?? []), 0);
}

/** Activity analytics for the signed-in user, derived from their own posts. */
export function Analytics({ onBack, onOpenPremium }: { onBack: () => void; onOpenPremium: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const { myPosts } = useStore();
  const premium = !!user?.premium;

  const views = myPosts.reduce((n, p) => n + p.views, 0);
  const likes = myPosts.reduce((n, p) => n + p.likes, 0);
  const comments = myPosts.reduce((n, p) => n + countComments(p.comments), 0);
  const shares = myPosts.reduce((n, p) => n + p.shares, 0);
  const engagement = views ? Math.round(((likes + comments + shares) / views) * 1000) / 10 : 0;

  const top = [...myPosts].sort((a, b) => b.views - a.views).slice(0, 5);
  const maxViews = Math.max(1, ...top.map((p) => p.views));

  const tiles = [
    { icon: <RiEyeLine className="size-5" />, label: t("views"), value: compact(views) },
    { icon: <RiHeart3Line className="size-5" />, label: t("likes"), value: compact(likes) },
    { icon: <RiChat1Line className="size-5" />, label: t("comments"), value: compact(comments) },
    { icon: <RiRepeat2Line className="size-5" />, label: t("shares"), value: compact(shares) },
  ];

  return (
    <div className="scroll-clean flex h-full flex-col overflow-y-auto bg-canvas">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-2 py-2.5 backdrop-blur">
        <button onClick={onBack} aria-label={t("back")} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-3">
          <RiArrowLeftLine className="size-5" />
        </button>
        <h1 className="flex items-center gap-2 text-base font-bold text-ink">
          <RiBarChart2Line className="size-5 text-accent" />
          {t("analyticsTitle")}
        </h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="rounded-2xl border border-line bg-surface p-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">{tile.icon}</span>
              <p className="mt-3 text-2xl font-bold text-ink">{tile.value}</p>
              <p className="text-xs text-muted">{tile.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">{t("engagement")}</span>
            <span className="text-sm font-bold text-accent">{engagement}%</span>
          </div>
          <p className="mt-1 text-xs text-muted">{myPosts.length} {t("posts").toLowerCase()}</p>
        </div>

        {/* Extended analytics — a Plus feature. */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
            {t("topPosts")}
            {!premium && <RiVipCrown2Fill className="size-4 text-accent" />}
          </p>
          <div className={cx("flex flex-col gap-3", !premium && "blur-sm")}>
            {top.length === 0 ? (
              <p className="py-6 text-center text-sm text-faint">{t("noPosts")}</p>
            ) : (
              top.map((p) => (
                <div key={p.id}>
                  <p className="mb-1 truncate text-xs text-muted">{p.text || t("posts")}</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${(p.views / maxViews) * 100}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right text-xs font-medium text-ink">{compact(p.views)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {!premium && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface/60 p-4 text-center backdrop-blur-[1px]">
              <RiLockLine className="size-6 text-accent" />
              <p className="text-sm font-medium text-ink">{t("extendedLocked")}</p>
              <button onClick={onOpenPremium} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong">
                {t("menuPremium")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
