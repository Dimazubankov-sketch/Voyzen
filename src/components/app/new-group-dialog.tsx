"use client";

import { useState } from "react";
import { RiCheckLine, RiCloseLine, RiGroupLine, RiSearchLine } from "@remixicon/react";
import { Avatar } from "@/components/ui/avatar";
import { useT } from "@/lib/settings-context";
import { PEOPLE, type Person } from "@/lib/mock-data";
import { emailFor } from "@/lib/accounts";
import { cx } from "@/utils/cx";

/**
 * Group-creation modal. Rendered inside the app column (not portalled to body)
 * so it stays within the phone frame. Layout follows the shadcn dialog pattern:
 * header + scrollable body + sticky footer actions.
 */
export function NewGroupDialog({
  onClose,
  onCreate,
  initialMembers = [],
}: {
  onClose: () => void;
  onCreate: (name: string, members: Person[]) => void;
  initialMembers?: Person[];
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>(() => initialMembers.map((p) => p.id));

  const shown = PEOPLE.filter((p) =>
    p.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const pickedPeople = PEOPLE.filter((p) => picked.includes(p.id));

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const canCreate = name.trim().length > 0 && picked.length > 0;

  const create = () => {
    if (!canCreate) return;
    onCreate(
      name.trim(),
      PEOPLE.filter((p) => picked.includes(p.id)),
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="New group"
        className="relative flex max-h-[88%] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-float animate-pop-in sm:m-4 sm:rounded-3xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-line p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <RiGroupLine className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-ink">{t("newGroup")}</h2>
            <p className="text-sm text-muted">{t("newGroupSub")}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3"
          >
            <RiCloseLine className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="scroll-clean min-h-0 flex-1 overflow-y-auto p-4">
          <label className="mb-1.5 block text-sm font-medium text-ink" htmlFor="group-name">
            {t("groupName")}
          </label>
          <input
            id="group-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Weekend Trip 🏔️"
            className="mb-4 h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/30"
          />

          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-ink">{t("members")}</span>
            <span className="text-xs text-muted">{picked.length} {t("selected")}</span>
          </div>

          {/* Selected people ride above the search, each poppable off with a tap. */}
          {pickedPeople.length > 0 && (
            <div className="scroll-clean mb-3 flex gap-3 overflow-x-auto pb-1">
              {pickedPeople.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  aria-label={`${t("close")} ${p.name}`}
                  className="flex w-14 shrink-0 flex-col items-center gap-1 animate-pop-in"
                >
                  <span className="relative">
                    <Avatar src={p.avatar} name={p.name} size={48} online={p.online} />
                    <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full border-2 border-surface bg-danger text-white">
                      <RiCloseLine className="size-2.5" />
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[11px] text-muted">{p.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>
          )}

          <div className="mb-3 flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2">
            <RiSearchLine className="size-4 shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPeople")}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-faint"
            />
          </div>

          <div className="flex flex-col">
            {shown.map((p) => {
              const on = picked.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  aria-pressed={on}
                  className="flex items-center gap-3 rounded-xl px-1 py-2 text-left transition hover:bg-surface-2"
                >
                  <Avatar src={p.avatar} name={p.name} size={40} online={p.online} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                    <p className="truncate text-xs text-muted">{emailFor(p.handle)}</p>
                  </div>
                  <span
                    className={cx(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border transition",
                      on ? "border-accent bg-accent text-white" : "border-line bg-surface",
                    )}
                  >
                    {on && <RiCheckLine className="size-3.5" />}
                  </span>
                </button>
              );
            })}
            {shown.length === 0 && (
              <p className="py-6 text-center text-sm text-faint">Nobody matches that.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-line p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-line bg-surface text-sm font-medium text-ink transition hover:bg-surface-3"
          >
            {t("cancel")}
          </button>
          <button
            onClick={create}
            disabled={!canCreate}
            className="h-11 flex-1 rounded-xl bg-accent text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("createGroup")}
          </button>
        </div>
      </div>
    </div>
  );
}
