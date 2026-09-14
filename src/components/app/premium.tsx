"use client";

import { useState } from "react";
import {
  RiArrowLeftLine,
  RiBarChart2Line,
  RiCheckLine,
  RiCloseCircleLine,
  RiHandCoinLine,
  RiPushpin2Line,
  RiSpam3Line,
  RiUploadCloud2Line,
  RiVerifiedBadgeFill,
  RiVipDiamondFill,
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useT } from "@/lib/settings-context";
import { cx } from "@/utils/cx";

type Plan = "month" | "year";

/** Voyzen Plus paywall: month / year plans and the perks they unlock. */
export function Premium({ onBack }: { onBack: () => void }) {
  const t = useT();
  const { user, subscribe, cancelSubscription } = useAuth();
  const [plan, setPlan] = useState<Plan>("year");
  const premium = !!user?.premium;

  const benefits = [
    { icon: <RiPushpin2Line className="size-5" />, text: t("benefitPins") },
    { icon: <RiUploadCloud2Line className="size-5" />, text: t("benefitFiles") },
    { icon: <RiVerifiedBadgeFill className="size-5" />, text: t("benefitBadge") },
    { icon: <RiSpam3Line className="size-5" />, text: t("benefitLessAds") },
    { icon: <RiHandCoinLine className="size-5" />, text: t("benefitRevenue") },
    { icon: <RiBarChart2Line className="size-5" />, text: t("benefitAnalytics") },
  ];

  const until = user?.premiumUntil
    ? new Date(user.premiumUntil).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "";

  return (
    <div className="scroll-clean flex h-full flex-col overflow-y-auto bg-canvas">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-2 py-2.5 backdrop-blur">
        <button onClick={onBack} aria-label={t("back")} className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-3">
          <RiArrowLeftLine className="size-5" />
        </button>
        <h1 className="text-base font-bold text-ink">{t("menuPremium")}</h1>
      </header>

      <div className="flex flex-col gap-5 p-4">
        {/* Hero */}
        <div className="flex flex-col items-center gap-2 rounded-3xl bg-gradient-to-br from-accent to-accent-strong px-6 py-8 text-center text-white">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white/15">
            <RiVipDiamondFill className="size-9" />
          </span>
          <h2 className="text-2xl font-bold">{t("plusTitle")}</h2>
          <p className="max-w-xs text-sm text-white/80">{t("plusSub")}</p>
        </div>

        {/* Benefits */}
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">{b.icon}</span>
              <span className="text-sm text-ink">{b.text}</span>
            </div>
          ))}
        </div>

        {premium ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-accent bg-accent-soft px-4 py-3 text-sm font-medium text-accent">
              <RiCheckLine className="size-5" />
              {t("subActiveUntil")} {until}
            </div>
            <button
              onClick={cancelSubscription}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-line text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              <RiCloseCircleLine className="size-5" />
              {t("cancelSubscription")}
            </button>
          </div>
        ) : (
          <>
            {/* Plans */}
            <div className="grid grid-cols-2 gap-3">
              <PlanCard
                active={plan === "month"}
                onClick={() => setPlan("month")}
                title={t("planMonth")}
                price="₽299"
                per={t("perMonth")}
              />
              <PlanCard
                active={plan === "year"}
                onClick={() => setPlan("year")}
                title={t("planYear")}
                price="₽2 490"
                per={t("perYear")}
                badge={t("bestValue")}
              />
            </div>

            <button
              onClick={() => subscribe(plan)}
              className="h-12 w-full rounded-2xl bg-accent text-sm font-semibold text-white transition hover:bg-accent-strong active:scale-[0.99]"
            >
              {t("subscribe")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  active,
  onClick,
  title,
  price,
  per,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  price: string;
  per: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "relative rounded-2xl border-2 p-4 text-left transition",
        active ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-muted",
      )}
    >
      {badge && (
        <span className="absolute -top-2 right-3 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">{badge}</span>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-xl font-bold text-ink">{price}</p>
      <p className="text-xs text-muted">{per}</p>
    </button>
  );
}
