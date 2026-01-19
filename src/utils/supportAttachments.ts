import { supabase } from "@/integrations/supabase/client";

export type SupportAttachmentType = "image" | "video";

export interface SupportAttachmentRaw {
  name?: string;
  type?: SupportAttachmentType;
  // New (preferred): stored in DB
  bucket?: string;
  path?: string;
  // Legacy: some rows may store a direct URL
  url?: string;
}

export interface SupportAttachmentResolved {
  name: string;
  type: SupportAttachmentType;
  url: string;
  bucket?: string;
  path?: string;
}

export const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const safeJsonParse = (v: unknown): unknown => {
  if (typeof v !== "string") return v;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
};

const normalizeRawAttachments = (raw: unknown): SupportAttachmentRaw[] => {
  const parsed = safeJsonParse(raw);

  if (Array.isArray(parsed)) {
    return parsed.filter(isObject) as SupportAttachmentRaw[];
  }

  // Sometimes a single object may come through
  if (isObject(parsed)) return [parsed as SupportAttachmentRaw];

  return [];
};

const extractPathFromPublicUrl = (url: string, bucket: string): string | null => {
  // Example:
  // https://.../storage/v1/object/public/support-attachments/<PATH>
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
};

export async function resolveSupportAttachments(
  raw: unknown,
  opts?: { expiresInSeconds?: number; defaultBucket?: string }
): Promise<SupportAttachmentResolved[]> {
  const defaultBucket = opts?.defaultBucket ?? SUPPORT_ATTACHMENTS_BUCKET;
  const expiresInSeconds = opts?.expiresInSeconds ?? 60 * 60; // 1 hour

  const rawAttachments = normalizeRawAttachments(raw);

  const resolved = await Promise.all(
    rawAttachments.map(async (att) => {
      const type = att.type === "video" ? "video" : att.type === "image" ? "image" : null;
      const name = typeof att.name === "string" && att.name.trim().length > 0 ? att.name : "attachment";
      const bucket = typeof att.bucket === "string" && att.bucket.trim().length > 0 ? att.bucket : defaultBucket;

      const pathFromAtt = typeof att.path === "string" && att.path.trim().length > 0 ? att.path : null;
      const pathFromUrl =
        typeof att.url === "string" && att.url.includes(`/object/public/${bucket}/`)
          ? extractPathFromPublicUrl(att.url, bucket)
          : null;

      const path = pathFromAtt ?? pathFromUrl;

      // Prefer signed URLs for private buckets so <img>/<video> can load.
      if (path) {
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresInSeconds);

        if (!error && data?.signedUrl && type) {
          return {
            name,
            type,
            url: data.signedUrl,
            bucket,
            path,
          } satisfies SupportAttachmentResolved;
        }
      }

      // Fallback: if we only have a direct URL
      if (typeof att.url === "string" && att.url.length > 0 && type) {
        return {
          name,
          type,
          url: att.url,
          bucket,
          path: path ?? undefined,
        } satisfies SupportAttachmentResolved;
      }

      return null;
    })
  );

  return resolved.filter(Boolean) as SupportAttachmentResolved[];
}
