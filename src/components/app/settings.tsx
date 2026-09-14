"use client";

import { useState } from "react";
import {
  RiArrowDownSLine,
  RiArrowLeftLine,
  RiCheckLine,
  RiGlobalLine,
  RiMoonLine,
  RiSmartphoneLine,
  RiSunLine,
  RiPulseLine,
} from "@remixicon/react";
import { useAuth } from "@/lib/auth-context";
import { useSettings, type PrivacyLevel } from "@/lib/settings-context";
import { useTheme } from "@/lib/theme-context";
import { LANGUAGES } from "@/lib/i18n";
import { Flag, formatPhone } from "@/components/base/phone-input";
import { Toggle } from "@/components/ui/toggle";
import { cx } from "@/utils/cx";

export function Settings({ onBack }: { onBack: () => void }) {
  const { t, lang, setLang, toggles, setToggle, privacy, setPrivacy, isWideScreen } = useSettings();
  const { theme, toggle } = useTheme();
  const { user } = useAuth();

  return (
    <div className="scroll-clean flex h-full flex-col overflow-y-auto bg-canvas">
      <header className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-line bg-surface/90 px-2 py-2.5 backdrop-blur">
        <button
          onClick={onBack}
          aria-label={t("back")}
          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-surface-3"
        >
          <RiArrowLeftLine className="size-5" />
        </button>
        <h1 className="text-base font-bold text-ink">{t("settings")}</h1>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {/* Language */}
        <Section title={t("language")} icon={<RiGlobalLine className="size-4" />}>
          <div className="flex flex-col">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2"
              >
                <Flag iso2={l.iso2} className="h-4 w-6" />
                <span className="flex-1 text-sm font-medium text-ink">{l.label}</span>
                {lang === l.code && <RiCheckLine className="size-5 text-accent" />}
              </button>
            ))}
          </div>
        </Section>

        {/* Appearance */}
        <Section title={t("appearance")}>
          <Row
            label={t("darkMode")}
            icon={
              theme === "dark" ? (
                <RiMoonLine className="size-5 text-muted" />
              ) : (
                <RiSunLine className="size-5 text-muted" />
              )
            }
          >
            <Toggle on={theme === "dark"} onChange={toggle} label={t("darkMode")} />
          </Row>

          {/* Only meaningful on a screen wide enough for the desktop layout. */}
          {isWideScreen && (
            <Row
              label={t("mobileView")}
              hint={t("mobileViewHint")}
              icon={<RiSmartphoneLine className="size-5 text-muted" />}
            >
              <Toggle
                on={toggles.mobileView}
                onChange={(v) => setToggle("mobileView", v)}
                label={t("mobileView")}
              />
            </Row>
          )}
        </Section>

        {/* Interface */}
        <Section title={t("interfaceSection")}>
          <Row label={t("haptics")} icon={<RiPulseLine className="size-5 text-muted" />}>
            <Toggle on={toggles.haptics} onChange={(v) => setToggle("haptics", v)} label={t("haptics")} />
          </Row>
        </Section>

        {/* Notifications & privacy */}
        <Section title={t("privacy")}>
          <Row label={t("pushNotifications")}>
            <Toggle
              on={toggles.push}
              onChange={(v) => setToggle("push", v)}
              label={t("pushNotifications")}
            />
          </Row>
          <Row label={t("readReceipts")}>
            <Toggle
              on={toggles.readReceipts}
              onChange={(v) => setToggle("readReceipts", v)}
              label={t("readReceipts")}
            />
          </Row>
        </Section>

        {/* Account privacy */}
        <Section title={t("accountPrivacy")}>
          <PrivacyRow label={t("whoAddsToGroup")} value={privacy.addToGroup} onChange={(v) => setPrivacy("addToGroup", v)} />
          <PrivacyRow label={t("whoMessages")} value={privacy.message} onChange={(v) => setPrivacy("message", v)} />
          <PrivacyRow label={t("whoSeesPosts")} value={privacy.posts} onChange={(v) => setPrivacy("posts", v)} />
        </Section>

        {/* Account */}
        <Section title={t("account")}>
          <Row label={t("email")}>
            <span className="text-sm text-muted">{user?.email || "—"}</span>
          </Row>
          <Row label={t("phone")}>
            <span className="text-sm text-muted">
              {user?.phone ? formatPhone(user.phone) : "—"}
            </span>
          </Row>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h2 className="flex items-center gap-1.5 border-b border-line px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        {title}
      </h2>
      <div className="p-1.5">{children}</div>
    </section>
  );
}

function Row({
  label,
  hint,
  icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      {children}
    </div>
  );
}


/** One privacy setting: a label with an expandable everyone/followers/selected/nobody picker. */
function PrivacyRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PrivacyLevel;
  onChange: (v: PrivacyLevel) => void;
}) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const options: { key: PrivacyLevel; label: string }[] = [
    { key: "everyone", label: t("privEveryone") },
    { key: "followers", label: t("privFollowers") },
    { key: "selected", label: t("privSelected") },
    { key: "nobody", label: t("privNobody") },
  ];
  const current = options.find((o) => o.key === value)?.label ?? "";

  return (
    <div className="rounded-xl">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2">
        <span className="min-w-0 flex-1 text-sm font-medium text-ink">{label}</span>
        <span className="shrink-0 text-sm text-muted">{current}</span>
        <RiArrowDownSLine className={cx("size-4 shrink-0 text-faint transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-2 px-3 pb-2">
          {options.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                onChange(o.key);
                setOpen(false);
              }}
              className={cx(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                value === o.key ? "bg-accent text-white" : "bg-surface-2 text-ink hover:bg-surface-3",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
