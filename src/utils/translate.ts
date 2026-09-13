/**
 * Translate a snippet of text into `target` (a 2-letter language code) using
 * the free, key-less MyMemory API. There's no backend in this build, so this
 * calls the public endpoint directly from the browser. Source language is a
 * light Cyrillic-vs-Latin heuristic — enough for the demo content.
 */
export async function translateText(text: string, target: string): Promise<string> {
  const source = /[\u0400-\u04FF]/.test(text) ? "ru" : "en";
  const langpair = `${source}|${target}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`translate failed: ${res.status}`);
  const data = (await res.json()) as { responseData?: { translatedText?: string } };
  const out = data?.responseData?.translatedText;
  if (!out) throw new Error("no translation");
  return out;
}
