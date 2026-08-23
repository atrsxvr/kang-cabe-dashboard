/**
 * Kode galat otentikasi, dalam bahasa yang dipakai orangnya.
 *
 * Halaman galat bawaan pustakanya menampilkan `signup_disabled` mentah di atas
 * kotak "Something went wrong" berbahasa Inggris. Tiga dari empat pemakai
 * aplikasi ini bukan orang teknis — penolakan yang tidak menyebut sebabnya
 * membuat orang mencoba berkali-kali, lalu menyangka aplikasinya rusak, lalu
 * menelepon Admin yang juga tidak tahu apa artinya.
 *
 * Tiap pesan menyebut **langkah berikutnya**, bukan cuma apa yang gagal.
 */
export const authErrorMessages: Record<string, string> = {
  /**
   * Google berhasil membuktikan siapa yang datang, tapi emailnya tidak ada di
   * tabel anggota. Inilah penolakan yang paling sering terjadi, dan memang
   * disengaja: pendaftaran sendiri dimatikan.
   */
  signup_disabled:
    "Email itu belum didaftarkan sebagai anggota. Minta Admin menambahkannya di Settings dulu, baru coba masuk lagi.",

  /**
   * Barisnya ada tapi belum tertaut ke akun Google mana pun, dan penautannya
   * ditolak. Sekarang seharusnya tidak terjadi lagi — anggota undangan ditandai
   * terverifikasi — tapi kalau muncul, sebabnya di sisi kami, bukan di sisi
   * orang yang mencoba masuk.
   */
  account_not_linked:
    "Akun Google-nya belum bisa disambungkan ke anggota yang terdaftar. Kasih tahu Admin — ini urusan setelan, bukan salah kamu.",

  email_not_verified:
    "Google belum memverifikasi email itu. Pakai akun Google yang emailnya sudah aktif.",

  /** Cookie state hilang: biasanya tab dibiarkan terlalu lama atau di-refresh. */
  state_not_found:
    "Prosesnya kelamaan atau halamannya sempat dimuat ulang. Coba masuk sekali lagi.",

  please_restart_the_process:
    "Prosesnya terputus di tengah jalan. Coba masuk sekali lagi.",
};

/**
 * Pesan untuk sebuah kode, atau kalimat umum yang tetap menyebut kodenya.
 *
 * Kodenya ikut dicetak justru supaya bisa dilaporkan: kalimat umum tanpa kode
 * membuat kegagalan yang belum pernah ditemui jadi tidak bisa ditelusuri sama
 * sekali.
 */
export function authErrorMessage(code: string | undefined): string | null {
  if (!code) return null;

  return (
    authErrorMessages[code] ??
    `Nggak bisa masuk (${code}). Coba sekali lagi, dan kasih tahu Admin kalau tetap gagal.`
  );
}
