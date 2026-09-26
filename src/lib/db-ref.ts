/**
 * Ref proyek Supabase, dibaca dari connection string.
 *
 * Supabase menaruhnya di username pooler (`postgres.<ref>`), dan itu satu-satunya
 * bagian dari URL yang membedakan satu proyek dari proyek lain — host dan nama
 * basis datanya sama persis untuk semua orang di region yang sama.
 *
 * Dipakai dua hal yang kelihatannya tidak berhubungan, dan itu sengaja disatukan
 * di sini: menurunkan URL REST Supabase, dan mengenali apakah perintah yang mau
 * dijalankan sedang mengarah ke basis data produksi. Menyalin regexnya ke dua
 * tempat berarti suatu hari yang satu diperbaiki dan yang lain tidak — dan yang
 * tertinggal adalah yang menjaga.
 *
 * Mengembalikan null untuk apa pun yang bukan pooler Supabase, termasuk Postgres
 * lokal dan basis data sekali pakai di CI.
 */
export function projectRefOf(connectionString: string | undefined): string | null {
  if (!connectionString) return null;

  const user = connectionString.match(/^[a-z+]+:\/\/([^:@/]+)/i)?.[1];
  if (!user?.startsWith("postgres.")) return null;

  const ref = user.slice("postgres.".length);
  return ref === "" ? null : ref;
}
