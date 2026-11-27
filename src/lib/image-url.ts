/**
 * Resolve a listing image's storage key to its public delivery URL.
 * Absolute URLs remain supported for legacy/external images. Object keys require
 * R2_PUBLIC_BASE_URL to point at the bucket's configured public/custom domain.
 */
export function resolvePublicImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;

  const configuredBase = process.env.R2_PUBLIC_BASE_URL?.trim();
  if (!configuredBase) return null;

  try {
    const base = new URL(configuredBase);
    if (!["https:", "http:"].includes(base.protocol)) return null;
    if (base.protocol === "http:" && !["localhost", "127.0.0.1"].includes(base.hostname)) return null;

    const key = value.replace(/^\/+/, "");
    if (!key || key.split("/").some((segment) => segment === "." || segment === "..")) return null;
    const encodedKey = key.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    return new URL(encodedKey, base.toString().replace(/\/*$/, "/")).toString();
  } catch {
    return null;
  }
}
