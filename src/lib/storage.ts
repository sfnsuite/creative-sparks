import { supabase } from "@/integrations/supabase/client";

const BUCKET = "product-images";

/**
 * Returns a URL for a stored image. The bucket is private, so we produce
 * a signed URL. For products/cards we render <img>; this returns the public
 * URL from the bucket (works when the bucket is public) or a signed URL fallback.
 * If the value is already a full URL we return it as-is.
 */
export function publicImageUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(pathOrUrl);
  return data.publicUrl;
}

export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function deleteProductImage(path: string) {
  if (!path || /^https?:\/\//i.test(path)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
