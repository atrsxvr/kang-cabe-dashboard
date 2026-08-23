import { canWrite, type Area } from "@/lib/permissions";
import { currentActor } from "@/server/auth/guard";

/**
 * Menampilkan isinya hanya kepada yang boleh menulis di wilayah itu.
 *
 * **Bukan penjagaan**, dan itu perlu ditegaskan supaya tidak ada yang bersandar
 * padanya: yang menahan perubahan data adalah `guardWrite` di 55 Server Action,
 * yang membaca database. Komponen ini semata kerapian — menampilkan tombol yang
 * pasti ditolak adalah menyuruh orang mengetik satu formulir penuh untuk
 * dibuang.
 *
 * Aman dipakai bertebaran: `currentActor` dibungkus `cache`, jadi sepuluh
 * pemakaian di satu halaman tetap satu query.
 */
export async function CanWrite({
  area,
  children,
  fallback = null,
}: {
  area: Area;
  children: React.ReactNode;
  /**
   * Yang ditampilkan kepada yang tidak boleh. Default kosong.
   *
   * Ada karena kadang menghilangkan tombol begitu saja justru membingungkan —
   * halaman yang kehilangan satu-satunya tombolnya terlihat rusak, bukan
   * terlarang. Untuk kasus itu, isi dengan satu kalimat yang menyebut siapa
   * yang mengurusnya.
   */
  fallback?: React.ReactNode;
}) {
  const actor = await currentActor();

  if (!actor || !canWrite(actor.role, area)) return <>{fallback}</>;

  return <>{children}</>;
}
