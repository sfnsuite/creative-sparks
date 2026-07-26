import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";

/**
 * Allowed image types for product uploads. The storage bucket should also
 * enforce these server-side (see SECURITY.md — manual dashboard step).
 */
const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MiB

/**
 * Returns a URL for a stored image. If the value is already an absolute URL
 * we return it as-is; otherwise we resolve it against the bucket.
 */
export function publicImageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathOrUrl);
  return data.publicUrl;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = ALLOWED_MIME[file.type];
  if (!ext) {
    throw new Error("نوع الصورة غير مسموح. استعمل JPG، PNG، WEBP أو AVIF.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("الصورة كبيرة بزاف (الحد الأقصى 8MB).");
  }

  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userRes.user) {
    throw new Error("يجب تسجيل الدخول لرفع الصور.");
  }

  const path = `${userRes.user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return path;
}

export async function deleteProductImage(path: string): Promise<void> {
  if (!path || /^https?:\/\//i.test(path)) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}
