export function buildDownloadFilename(
  preferredBase: string | undefined,
  fallbackBase: string,
  extension: string
) {
  const normalized = (preferredBase ?? "")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const base = normalized || fallbackBase;
  return `${base}.${extension}`;
}
