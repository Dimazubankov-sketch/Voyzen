"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { RiPauseFill, RiPlayFill } from "@remixicon/react";
import type { AudioAttachment, VideoAttachment } from "@/lib/mock-data";
import { cx } from "@/utils/cx";

export const BARS = 40;

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export type RecordKind = "audio" | "video";

export interface RecordingResult {
  kind: RecordKind;
  url: string;
  duration: number;
  peaks: number[];
}

/**
 * Microphone (and optionally camera) capture with a live level meter.
 *
 * Bar heights are written straight into `barsRef` elements from a rAF loop, so
 * the meter tracks real speech without re-rendering React 60 times a second.
 */
export function useMediaRecorder(barsRef: MutableRefObject<(HTMLDivElement | null)[]>) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const peaksRef = useRef<number[]>([]);
  const startedAtRef = useRef(0);
  const kindRef = useRef<RecordKind>("audio");
  const facingRef = useRef<"user" | "environment">("user");
  /** Resolves once `onstop` has assembled the blob. */
  const settleRef = useRef<((r: RecordingResult | null) => void) | null>(null);

  const teardown = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  const start = useCallback(
    async (kind: RecordKind) => {
      setError(null);
      setSeconds(0);
      kindRef.current = kind;
      peaksRef.current = [];
      chunksRef.current = [];

      try {
        facingRef.current = "user";
        const media = await navigator.mediaDevices.getUserMedia(
          kind === "video"
            ? { video: { width: 480, height: 480, facingMode: facingRef.current }, audio: true }
            : { audio: true },
        );
        streamRef.current = media;
        setStream(media);

        const recorder = new MediaRecorder(media);
        recorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: recorder.mimeType || (kind === "video" ? "video/webm" : "audio/webm"),
          });
          const duration = (Date.now() - startedAtRef.current) / 1000;
          const settle = settleRef.current;
          settleRef.current = null;
          teardown();
          setRecording(false);
          if (settle) {
            settle(
              blob.size > 0
                ? { kind, url: URL.createObjectURL(blob), duration, peaks: peaksRef.current.slice(-BARS) }
                : null,
            );
          }
        };

        startedAtRef.current = Date.now();
        recorder.start();
        setRecording(true);

        // Live level metering from the audio track.
        const context = new AudioContext();
        ctxRef.current = context;
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        context.createMediaStreamSource(media).connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);
        let lastPeakAt = 0;

        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const level = Math.min(1, sum / data.length / 140);

          for (let i = 0; i < BARS; i++) {
            const bin = Math.floor((i / BARS) * data.length * 0.7);
            const v = data[bin] / 255;
            const el = barsRef.current[i];
            if (el) el.style.height = `${8 + Math.min(1, v * 1.4) * 92}%`;
          }

          const now = Date.now();
          if (now - lastPeakAt > 90) {
            lastPeakAt = now;
            peaksRef.current.push(level);
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return true;
      } catch {
        setError(
          kind === "video"
            ? "Camera access is blocked. Allow it in your browser to record."
            : "Microphone access is blocked. Allow it in your browser to record.",
        );
        teardown();
        return false;
      }
    },
    [barsRef, teardown],
  );

  /** Stop and hand back the recording (or null if nothing was captured). */
  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== "recording") {
      teardown();
      setRecording(false);
      return Promise.resolve<RecordingResult | null>(null);
    }
    return new Promise<RecordingResult | null>((resolve) => {
      settleRef.current = resolve;
      recorder.stop();
    });
  }, [teardown]);

  /** Stop and throw the recording away. */
  const cancel = useCallback(async () => {
    settleRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") recorder.stop();
    teardown();
    setRecording(false);
    setError(null);
  }, [teardown]);

  /** Flip the video preview between the front and back cameras. */
  const flipCamera = useCallback(async () => {
    if (kindRef.current !== "video" || !streamRef.current) return;
    const next = facingRef.current === "user" ? "environment" : "user";
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 480, height: 480, facingMode: next },
        audio: false,
      });
      const newTrack = media.getVideoTracks()[0];
      if (!newTrack) return;
      const current = streamRef.current;
      current.getVideoTracks().forEach((tr) => {
        current.removeTrack(tr);
        tr.stop();
      });
      current.addTrack(newTrack);
      facingRef.current = next;
      // Re-point the preview at the same stream so the <video> refreshes.
      setStream(null);
      setStream(current);
    } catch {
      /* second camera unavailable */
    }
  }, []);

  return { recording, seconds, error, stream, start, stop, cancel, flipCamera, setError };
}

/** The live meter shown while recording. */
export function LevelMeter({
  barsRef,
  className,
}: {
  barsRef: MutableRefObject<(HTMLDivElement | null)[]>;
  className?: string;
}) {
  return (
    <div className={cx("flex h-8 flex-1 items-center justify-center gap-0.5 overflow-hidden", className)}>
      {Array.from({ length: BARS }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            barsRef.current[i] = el;
          }}
          className="w-0.5 shrink-0 rounded-full bg-accent/70 transition-[height] duration-75"
          style={{ height: "8%" }}
        />
      ))}
    </div>
  );
}

/** Playback bubble for a recorded voice message. */
export function VoiceMessage({ audio, mine }: { audio: AudioAttachment; mine: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const peaks = audio.peaks.length > 0 ? audio.peaks : Array.from({ length: 28 }, () => 0.4);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  return (
    <div className="flex w-56 items-center gap-2.5">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className={cx(
          "flex size-9 shrink-0 items-center justify-center rounded-full transition",
          mine ? "bg-white/20 text-white hover:bg-white/30" : "bg-accent text-white hover:bg-accent-strong",
        )}
      >
        {playing ? <RiPauseFill className="size-5" /> : <RiPlayFill className="size-5" />}
      </button>

      <div className="flex h-8 flex-1 items-center gap-0.5">
        {peaks.map((p, i) => {
          const played = i / peaks.length <= progress;
          return (
            <div
              key={i}
              className={cx(
                "flex-1 rounded-full transition-opacity",
                mine ? "bg-white" : "bg-accent",
                played ? "opacity-100" : "opacity-35",
              )}
              style={{ height: `${Math.max(12, Math.min(1, p * 1.6) * 100)}%` }}
            />
          );
        })}
      </div>

      <span className={cx("shrink-0 font-mono text-[11px]", mine ? "text-white/80" : "text-muted")}>
        {formatTime(audio.duration)}
      </span>

      <audio
        ref={ref}
        src={audio.url}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          const total = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : audio.duration;
          setProgress(total > 0 ? Math.min(1, el.currentTime / total) : 0);
        }}
      />
    </div>
  );
}

/** Round video message, Telegram-style: tap the circle to play. */
export function VideoMessage({ video, mine }: { video: VideoAttachment; mine: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={toggle}
        aria-label={playing ? "Pause" : "Play"}
        className="relative size-44 overflow-hidden rounded-full bg-black/10"
      >
        <video
          ref={ref}
          src={video.url}
          playsInline
          className="size-full scale-x-[-1] object-cover"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        {!playing && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="flex size-12 items-center justify-center rounded-full bg-white/90 text-ink">
              <RiPlayFill className="size-6" />
            </span>
          </span>
        )}
      </button>
      <span className={cx("font-mono text-[11px]", mine ? "text-white/80" : "text-muted")}>
        {formatTime(video.duration)}
      </span>
    </div>
  );
}
