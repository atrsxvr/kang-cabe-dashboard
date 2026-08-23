/**
 * Phone cameras produce 3–8 MB files. Sending those raw over a field data
 * connection is slow and can exceed the Server Action body limit, so the image
 * is resized and re-encoded in the browser first. 1600px is comfortably enough
 * to see a leaf spot.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export async function downscaleImage(file: File): Promise<File> {
  // Anything already small enough is left untouched — re-encoding would only
  // lose detail.
  if (file.size < 400_000) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY)
  );

  if (!blob || blob.size >= file.size) return file;

  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
}
