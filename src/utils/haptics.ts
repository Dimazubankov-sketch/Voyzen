/**
 * Light haptic feedback for taps. The Vibration API is supported on Android
 * browsers (a no-op elsewhere, e.g. iOS Safari), so this is best-effort — it
 * makes the UI feel alive where the platform allows it. A global listener in
 * the app shell fires this on button/link taps; components can also call it
 * directly. Controlled by a settings toggle via `setHapticsEnabled`.
 */

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

export function haptic(pattern: number | number[] = 8) {
  if (!enabled) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* unsupported */
  }
}
