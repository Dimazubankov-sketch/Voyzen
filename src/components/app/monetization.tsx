"use client";

import { useState } from "react";
import { RiArrowLeftLine, RiMoneyDollarCircleLine, RiVipCrown2Fill } from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/app-store";
import { useT } from "@/lib/settings-context";
import { compact } from "./post-card";

const RATE = 0.05; // ₽ per view — a demo figure.

/** Creator monetization — earnings estimated from post views. Plus only. */
export function Monetization({ onBack, onOpenPremium }: { onBack: () => void; onOpenPremium: () => void }) {
  const t = useT();
  const { user } = useAuth();
  const { myPosts } = useStore();
  const premium = !!user?.premium;
  const [withdrawn, setWithdrawn] = useState(false);

  const views = myPosts.reduce((n, p) => n + p.views, 0);
  const total = Math.round(views * RATE);
  const thisMonth = Math.round(total * 0.32);
  const pending = Math.round(total * 0.18);
  const money = (n: number) => `₽${n.toLocaleString("ru-RU")}`;

  return (
    <div className="scroll-clean flex h-full flex-col overflow-y-auto bg-canvas">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-2 py-2.5 backdrop-blur">
        <button onClick={onBack} aria-label={t("back")} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-3">
          <RiArrowLeftLine className="size-5" />
        </button>
        <h1 className="flex items-center gap-2 text-base font-bold text-ink">
          <RiMoneyDollarCircleLine className="size-5 text-accent" />
          {t("monetizationTitle")}
        </h1>
      </header>

      {!premium ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent">
            <RiVipCrown2Fill className="size-8" />
          </span>
          <p className="text-lg font-bold text-ink">{t("monetizationLocked")}</p>
          <p className="max-w-xs text-sm text-muted">{t("monetizationLockedSub")}</p>
          <button onClick={onOpenPremium} className="mt-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
            {t("menuPremium")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          <div className="rounded-2xl bg-gradient-to-br from-accent to-accent-strong p-5 text-white">
            <p className="text-sm text-white/80">{t("estimatedEarnings")}</p>
            <p className="mt-1 text-4xl font-bold">{money(total)}</p>
            <p className="mt-1 text-xs text-white/70">{compact(views)} {t("views").toLowerCase()} · ₽{RATE.toFixed(2)}/{t("views").toLowerCase()}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-2xl font-bold text-ink">{money(thisMonth)}</p>
              <p className="text-xs text-muted">{t("thisMonth")}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="text-2xl font-bold text-ink">{money(pending)}</p>
              <p className="text-xs text-muted">{t("pendingPayout")}</p>
            </div>
          </div>

          <button
            onClick={() => setWithdrawn(true)}
            disabled={withdrawn || pending === 0}
            className="h-12 w-full rounded-2xl bg-accent text-sm font-semibold text-white transition hover:bg-accent-strong disabled:opacity-50"
          >
            {withdrawn ? t("withdrawRequested") : `${t("withdraw")} · ${money(pending)}`}
          </button>
        </div>
      )}
    </div>
  );
}
