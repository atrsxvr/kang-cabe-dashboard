import "server-only";

import { deriveSupabaseUrl, getEnv } from "@/lib/env";

export const PHOTO_BUCKET = "health-photos";

/**
 * Uploads go through the server with the service-role key so the key never
 * reaches the browser and the bucket needs no public write policy. The client
 * downscales the image first, so what arrives here is well under the bucket's
 * 5 MB ceiling.
 */
export function storageConfig() {
  const env = getEnv();
  const url = env.SUPABASE_URL ?? deriveSupabaseUrl(env.DATABASE_URL);
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;
  return { url, key };
}

export function isPhotoUploadEnabled(): boolean {
  return storageConfig() !== null;
}

export type UploadResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function uploadFindingPhoto(file: File): Promise<UploadResult> {
  const config = storageConfig();

  if (!config) {
    return {
      ok: false,
      message:
        "Unggah foto belum aktif. Set SUPABASE_SERVICE_ROLE_KEY di .env terlebih dahulu.",
    };
  }

  const extension =
    { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[
      file.type
    ] ?? null;

  if (!extension) {
    return { ok: false, message: "Format foto harus JPG, PNG, atau WebP." };
  }

  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${extension}`;

  const response = await fetch(
    `${config.url}/storage/v1/object/${PHOTO_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": file.type,
        "cache-control": "public, max-age=31536000, immutable",
      },
      body: await file.arrayBuffer(),
    }
  );

  if (!response.ok) {
    console.error(
      "Upload foto gagal:",
      response.status,
      await response.text().catch(() => "")
    );
    return { ok: false, message: "Foto gagal diunggah. Coba lagi." };
  }

  return {
    ok: true,
    url: `${config.url}/storage/v1/object/public/${PHOTO_BUCKET}/${path}`,
  };
}

/**
 * Removes the stored object behind a photo URL.
 *
 * Deleting only the database row would leave the file behind — the same orphan
 * problem a failed form submission used to cause, except this one accumulates
 * every time a finding is tidied away.
 *
 * Returns nothing: a photo that outlives its finding is worth logging, not
 * worth blocking the deletion the user asked for.
 */
export async function deleteFindingPhoto(photoUrl: string): Promise<void> {
  const config = storageConfig();
  if (!config) return;

  const marker = `/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const path = photoUrl.split(marker)[1];

  if (!path) {
    console.error("Tidak bisa menentukan path foto dari URL:", photoUrl);
    return;
  }

  const response = await fetch(
    `${config.url}/storage/v1/object/${PHOTO_BUCKET}/${path}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${config.key}` } }
  ).catch((error: unknown) => {
    console.error("Gagal menghapus foto:", error);
    return null;
  });

  if (response && !response.ok) {
    console.error("Gagal menghapus foto:", response.status, path);
  }
}
