"use client";

import { useEffect, useRef, useState } from "react";
import {
  RiAddLine,
  RiBarChartHorizontalLine,
  RiCameraLine,
  RiCloseLine,
  RiDonutChartLine,
  RiFileGifLine,
  RiImageAddLine,
  RiMapPin2Line,
  RiMegaphoneLine,
  RiRefreshLine,
} from "@remixicon/react";
import { Avatar } from "@/components/ui/avatar";
import { ToggleVisual } from "@/components/ui/toggle";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/app-store";
import { useT } from "@/lib/settings-context";
import { RiVerifiedBadgeFill } from "@remixicon/react";
import type { Poll, Post } from "@/lib/mock-data";
import { emailFor } from "@/lib/accounts";
import { cx } from "@/utils/cx";
import { uid } from "@/utils/uid";
import { filesToDataUrls } from "@/utils/image";
import { PollView } from "./poll-chart";

const LIMIT = 500;
const MAX_IMAGES = 4;
const MAX_OPTIONS = 4;

type Panel = "camera" | "poll" | "location" | "gif" | null;

/**
 * Compose and publish a post: text, photos, a camera shot, a poll, a place, a
 * GIF. With `repostOf` set it becomes a quote-repost: the original is embedded
 * and publishing adds your comment on top of it.
 */
export function PostComposerDialog({ onClose, repostOf, editing }: { onClose: () => void; repostOf?: Post; editing?: Post }) {
  const { user } = useAuth();
  const { addPost, repost, editPost } = useStore();
  const t = useT();
  const isRepost = !!repostOf;
  const isEditing = !!editing;

  const [text, setText] = useState(editing?.text ?? "");
  const [images, setImages] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [poll, setPoll] = useState<Poll | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [isAd, setIsAd] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const pollReady = poll ? poll.options.filter((o) => o.text.trim()).length >= 2 : true;
  const canPublish = (isRepost || isEditing || !!(text.trim() || images.length || poll)) && pollReady;

  const publish = () => {
    if (!canPublish) return;
    if (editing) {
      editPost(editing.id, text.trim());
    } else if (repostOf) {
      repost(repostOf, text.trim());
    } else {
      addPost({
        text: text.trim(),
        images: images.length ? images : undefined,
        location: location.trim() || undefined,
        poll: poll ? { ...poll, options: poll.options.filter((o) => o.text.trim()) } : undefined,
        ad: isAd || undefined,
      });
    }
    onClose();
  };

  const addImages = async (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, MAX_IMAGES - images.length);
    const urls = await filesToDataUrls(files);
    setImages((prev) => [...prev, ...urls]);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="absolute inset-0 z-[55] flex items-end justify-center sm:items-center">
      <button
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("newPost")}
        className="relative flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-float animate-pop-in sm:m-4 sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <button
            onClick={onClose}
            aria-label={t("close")}
            className="flex size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-3"
          >
            <RiCloseLine className="size-5" />
          </button>
          <h2 className="flex-1 text-base font-semibold text-ink">{isEditing ? t("editPost") : isRepost ? t("quoteRepost") : t("newPost")}</h2>
          <button
            onClick={publish}
            disabled={!canPublish}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isEditing ? t("save") : t("publish")}
          </button>
        </div>

        <div className="scroll-clean min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex gap-3">
            <Avatar src={user?.avatar} name={user?.name ?? "You"} size={44} />
            <textarea
              autoFocus
              value={text}
              maxLength={LIMIT}
              onChange={(e) => setText(e.target.value)}
              rows={isRepost || isEditing ? 3 : 4}
              placeholder={isRepost ? t("addThoughts") : t("whatsHappening")}
              className="min-h-16 flex-1 resize-none bg-transparent text-[15px] leading-relaxed text-ink outline-none placeholder:text-faint"
            />
          </div>

          {/* Quoted original */}
          {repostOf && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-line">
              <div className="flex items-center gap-2 px-3 pt-3">
                <Avatar src={repostOf.author.avatar} name={repostOf.author.name} size={24} />
                <span className="truncate text-sm font-semibold text-ink">{repostOf.author.name}</span>
                {repostOf.author.verified && <RiVerifiedBadgeFill className="size-3.5 text-accent" />}
                <span className="truncate text-xs text-muted">{emailFor(repostOf.author.handle)}</span>
              </div>
              {repostOf.text && <p className="line-clamp-3 px-3 py-2 text-sm text-ink">{repostOf.text}</p>}
              {repostOf.images && repostOf.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={repostOf.images[0]} alt="" className="h-40 w-full object-cover" />
              )}
            </div>
          )}

          {location && (
            <div className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
              <RiMapPin2Line className="size-4" />
              {location}
              <button onClick={() => setLocation("")} aria-label={t("close")}>
                <RiCloseLine className="size-4" />
              </button>
            </div>
          )}

          {images.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {images.map((src, i) => (
                <div key={src} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-32 w-full rounded-xl object-cover" />
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={t("close")}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
                  >
                    <RiCloseLine className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {poll && (
            <div className="mt-3">
              <PollBuilder poll={poll} onChange={setPoll} onRemove={() => setPoll(null)} />
            </div>
          )}

          {/* Inline panels */}
          {panel === "camera" && (
            <CameraPanel
              onClose={() => setPanel(null)}
              onCapture={(dataUrl) => {
                setImages((prev) => [...prev, dataUrl].slice(0, MAX_IMAGES));
                setPanel(null);
              }}
            />
          )}
          {panel === "location" && (
            <LocationPanel
              value={location}
              onChange={setLocation}
              onClose={() => setPanel(null)}
            />
          )}
          {panel === "gif" && (
            <GifPanel
              onClose={() => setPanel(null)}
              onAdd={(url) => {
                setImages((prev) => [...prev, url].slice(0, MAX_IMAGES));
                setPanel(null);
              }}
            />
          )}
        </div>

        {/* Toolbar — a quote-repost only needs your words */}
        <div className={cx("border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]", (isRepost || isEditing) && "hidden")}>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void addImages(e.target.files)}
          />
          <button
            onClick={() => setIsAd((v) => !v)}
            className={cx(
              "mb-2 flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition",
              isAd ? "border-accent bg-accent-soft text-accent" : "border-line text-muted hover:bg-surface-2",
            )}
          >
            <RiMegaphoneLine className="size-5 shrink-0" />
            <span className="flex-1">{t("markAsAd")}</span>
            <ToggleVisual on={isAd} size="sm" />
          </button>

          <div className="flex items-center gap-1">
            <div className="scroll-clean flex min-w-0 flex-1 gap-1 overflow-x-auto">
              <Tool
                icon={<RiImageAddLine className="size-5" />}
                label={t("gallery")}
                disabled={images.length >= MAX_IMAGES}
                onClick={() => fileRef.current?.click()}
              />
              <Tool
                icon={<RiCameraLine className="size-5" />}
                label={t("camera")}
                disabled={images.length >= MAX_IMAGES}
                active={panel === "camera"}
                onClick={() => setPanel(panel === "camera" ? null : "camera")}
              />
              <Tool
                icon={<RiBarChartHorizontalLine className="size-5" />}
                label={t("poll")}
                active={!!poll}
                onClick={() =>
                  setPoll((current) =>
                    current
                      ? null
                      : {
                          chart: "bars",
                          options: [
                            { id: uid("o"), text: "", votes: 0 },
                            { id: uid("o"), text: "", votes: 0 },
                          ],
                        },
                  )
                }
              />
              <Tool
                icon={<RiMapPin2Line className="size-5" />}
                label={t("addLocation")}
                active={panel === "location" || !!location}
                onClick={() => setPanel(panel === "location" ? null : "location")}
              />
              <Tool
                icon={<RiFileGifLine className="size-5" />}
                label={t("gif")}
                disabled={images.length >= MAX_IMAGES}
                active={panel === "gif"}
                onClick={() => setPanel(panel === "gif" ? null : "gif")}
              />
            </div>
            <span className="shrink-0 pl-2 text-xs text-faint">
              {text.length}/{LIMIT}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PollBuilder({
  poll,
  onChange,
  onRemove,
}: {
  poll: Poll;
  onChange: (poll: Poll) => void;
  onRemove: () => void;
}) {
  const t = useT();

  const setOption = (id: string, text: string) =>
    onChange({ ...poll, options: poll.options.map((o) => (o.id === id ? { ...o, text } : o)) });

  const addOption = () =>
    onChange({
      ...poll,
      options: [...poll.options, { id: uid("o"), text: "", votes: 0 }],
    });

  const removeOption = (id: string) =>
    onChange({ ...poll, options: poll.options.filter((o) => o.id !== id) });

  // A preview needs some numbers to draw; these are illustrative only.
  const preview: Poll = {
    ...poll,
    options: poll.options
      .filter((o) => o.text.trim())
      .map((o, i) => ({ ...o, votes: [42, 27, 18, 13][i] ?? 10 })),
  };

  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{t("pollQuestion")}</span>
        <button
          onClick={onRemove}
          aria-label={t("close")}
          className="flex size-7 items-center justify-center rounded-full text-muted transition hover:bg-surface-3"
        >
          <RiCloseLine className="size-4" />
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {poll.options.map((o, i) => (
          <div key={o.id} className="flex items-center gap-2">
            <input
              value={o.text}
              onChange={(e) => setOption(o.id, e.target.value)}
              placeholder={`${t("option")} ${i + 1}`}
              maxLength={60}
              className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            {poll.options.length > 2 && (
              <button
                onClick={() => removeOption(o.id)}
                aria-label={t("close")}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface-3"
              >
                <RiCloseLine className="size-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {poll.options.length < MAX_OPTIONS && (
        <button
          onClick={addOption}
          className="mt-2 flex items-center gap-1.5 text-sm font-medium text-accent transition hover:underline"
        >
          <RiAddLine className="size-4" />
          {t("addOption")}
        </button>
      )}

      {/* Two chart styles to choose from */}
      <div className="mt-4">
        <span className="text-sm font-medium text-ink">{t("chartStyle")}</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(["bars", "donut"] as const).map((style) => (
            <button
              key={style}
              onClick={() => onChange({ ...poll, chart: style })}
              className={cx(
                "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                poll.chart === style
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink hover:border-accent",
              )}
            >
              {style === "bars" ? (
                <RiBarChartHorizontalLine className="size-5" />
              ) : (
                <RiDonutChartLine className="size-5" />
              )}
              {style === "bars" ? t("chartBars") : t("chartDonut")}
            </button>
          ))}
        </div>
      </div>

      {preview.options.length >= 2 && (
        <div className="mt-3 rounded-xl bg-surface p-3">
          <PollView poll={preview} compact />
        </div>
      )}
    </div>
  );
}

function CameraPanel({
  onCapture,
  onClose,
}: {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          media.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = media;
        if (videoRef.current) videoRef.current.srcObject = media;
      } catch {
        if (!cancelled) setError("Camera access is blocked. Allow it in your browser.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror it so the shot matches what the preview showed.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setShot(canvas.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface-2">
      {error ? (
        <div className="flex items-center gap-2 p-3">
          <RiCameraLine className="size-5 shrink-0 text-danger" />
          <p className="flex-1 text-xs text-muted">{error}</p>
          <button onClick={onClose} aria-label={t("close")} className="text-muted">
            <RiCloseLine className="size-5" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative aspect-video w-full bg-black">
            {shot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shot} alt="" className="size-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="size-full scale-x-[-1] object-cover" />
            )}
          </div>
          <div className="flex items-center gap-2 p-3">
            {shot ? (
              <>
                <button
                  onClick={() => setShot(null)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-ink transition hover:bg-surface-3"
                >
                  <RiRefreshLine className="size-4" />
                  {t("retake")}
                </button>
                <button
                  onClick={() => onCapture(shot)}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  {t("usePhoto")}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-ink transition hover:bg-surface-3"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={capture}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
                >
                  <RiCameraLine className="size-4" />
                  {t("takePhoto")}
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function LocationPanel({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  const detect = () => {
    if (!navigator.geolocation) return;
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // No geocoding service is wired up, so the coordinates stand in for a name.
        onChange(`${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`);
        setBusy(false);
        onClose();
      },
      () => setBusy(false),
      { timeout: 8000 },
    );
  };

  return (
    <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <RiMapPin2Line className="size-5 shrink-0 text-accent" />
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onClose()}
          placeholder={t("whereAreYou")}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button onClick={onClose} aria-label={t("close")} className="shrink-0 text-muted">
          <RiCloseLine className="size-5" />
        </button>
      </div>
      <button
        onClick={detect}
        disabled={busy}
        className="mt-2 text-sm font-medium text-accent transition hover:underline disabled:opacity-50"
      >
        {t("detectLocation")}
      </button>
    </div>
  );
}

function GifPanel({ onAdd, onClose }: { onAdd: (url: string) => void; onClose: () => void }) {
  const t = useT();
  const [url, setUrl] = useState("");
  const valid = /^https?:\/\/\S+$/i.test(url.trim());

  return (
    <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3">
      <div className="flex items-center gap-2">
        <RiFileGifLine className="size-5 shrink-0 text-accent" />
        <input
          autoFocus
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && valid && onAdd(url.trim())}
          placeholder={t("gifLink")}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button onClick={onClose} aria-label={t("close")} className="shrink-0 text-muted">
          <RiCloseLine className="size-5" />
        </button>
      </div>
      {valid && (
        <div className="mt-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url.trim()} alt="" className="h-20 rounded-lg object-cover" />
          <button
            onClick={() => onAdd(url.trim())}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            {t("addPhoto")}
          </button>
        </div>
      )}
    </div>
  );
}

function Tool({
  icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cx(
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition",
        active ? "bg-accent-soft text-accent" : "text-accent hover:bg-accent-soft",
        disabled && "cursor-not-allowed opacity-40",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
