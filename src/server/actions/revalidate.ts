import { revalidatePath } from "next/cache";

/**
 * Halaman yang menampilkan uang sebuah musim.
 *
 * Dikumpulkan di satu tempat karena daftarnya sudah pernah salah: patokan harga
 * jual dihitung dari biaya musim dan ikut tampil di dialog Catat Penjualan pada
 * halaman Panen, sementara semua aksi yang mengubah biaya cuma menyegarkan
 * Keuangan. Akibatnya harga lantai bisa basi persis di layar yang dibuka saat
 * berhadapan dengan pengepul — satu-satunya layar yang benar-benar tidak boleh.
 *
 * Menambah halaman baru yang menampilkan angka uang berarti menambahnya di
 * sini, sekali, bukan memburu setiap pemanggil `revalidatePath`.
 */
export function revalidateSeasonMoney() {
  // Rincian biaya, bagi hasil, patokan harga.
  revalidatePath("/finance");
  // Dialog penjualan membawa harga lantai yang dihitung dari biaya itu.
  revalidatePath("/harvest");
  // Dashboard merangkum keduanya.
  revalidatePath("/");
}
