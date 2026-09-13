/**
 * Read an image file and return a downscaled JPEG data URL.
 *
 * Profile photos are persisted in localStorage, which is small (~5 MB), so a
 * raw phone photo has to be resized before it goes in.
 */
export function fileToDataUrl(file: File, maxSize = 640, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode the image"));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas is unavailable"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert picked image files to downscaled JPEG data URLs. Object URLs (blob:)
 * die when the tab reloads, so anything persisted to localStorage must be a
 * data URL to survive — otherwise photos silently vanish on the next visit.
 */
export function filesToDataUrls(files: File[], maxSize = 1280, quality = 0.82): Promise<string[]> {
  return Promise.all(files.map((f) => fileToDataUrl(f, maxSize, quality)));
}

/** Human-readable file size, e.g. "2.4 MB". */
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Duration (seconds) of a video at `url`, read via its metadata. 0 on failure. */
export function readVideoDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => resolve(Number.isFinite(video.duration) ? video.duration : 0);
    video.onerror = () => resolve(0);
    video.src = url;
  });
}
