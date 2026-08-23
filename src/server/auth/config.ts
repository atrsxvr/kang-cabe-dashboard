import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { getEnv, isAuthConfigured } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * Otentikasi: satu jalan masuk, lewat Google.
 *
 * **Bersifat undangan.** `signUp` dimatikan, dan tanpa itu seluruh RBAC di
 * aplikasi ini sia-sia: kalau siapa pun bermodal Gmail bisa membuat akun
 * sendiri, peran cuma jadi label. Anggota didaftarkan Admin di Settings, dan
 * emailnya yang jadi undangan — kalau tidak ada barisnya, tidak ada jalan masuk.
 *
 * Google, bukan email-password, karena tiga dari empat pemakainya bukan orang
 * teknis: tidak ada sandi yang bisa dilupakan, dan tidak perlu layanan email
 * untuk memulihkannya — yang mana belum ada di proyek ini.
 */
const env = getEnv();

/** Kredensial sudah lengkap dan login benar-benar bisa dipakai. */
export const authReady = isAuthConfigured(env);

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Nilai pengganti hanya berlaku di localhost yang belum dikonfigurasi:
  // `parseEnv` menolak boot di produksi kalau ketiganya belum ada, dan
  // `authReady` di atas menahan tombol masuknya sampai ia benar.
  secret: env.BETTER_AUTH_SECRET ?? "belum-dikonfigurasi-hanya-untuk-localhost",
  baseURL: env.BETTER_AUTH_URL,

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      // Menutup pintu pendaftaran sendiri. Google boleh membuktikan siapa yang
      // datang; yang menentukan ia boleh masuk adalah barisnya di tabel anggota.
      disableSignUp: true,
    },
  },

  emailAndPassword: { enabled: false },

  account: {
    /**
     * Menautkan identitas Google ke baris anggota yang sudah ada.
     *
     * Wajib ada di aplikasi yang berbasis undangan. Barisnya dibuat Admin lebih
     * dulu, tanpa akun Google apa pun — dan tanpa penautan, masuk pertama kali
     * gagal dengan `account_not_linked`, karena `disableSignUp` melarang
     * membuat baris baru sementara yang lama tidak boleh disambung.
     *
     * `trustedProviders` sengaja cuma Google, dan itu yang membuatnya aman:
     * penautan lewat email hanya boleh dipercaya kalau penyedianya benar-benar
     * memverifikasi alamatnya. Google memverifikasi; penyedia yang menerima
     * email apa pun tanpa bukti tidak boleh masuk daftar ini.
     */
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },

  user: {
    // Peran dibawa di sesi supaya tombol bisa disembunyikan tanpa satu query
    // tambahan tiap render. Penegakannya tetap membaca database — lihat
    // `guard.ts`; yang di sesi ini optimistik, dan cookie bisa basi.
    additionalFields: {
      role: { type: "string", input: false },
      deletedAt: { type: "date", input: false, required: false },
    },
  },

  session: {
    // Tujuh hari. Dipakai di ponsel di kebun, dan login ulang tiap hari akan
    // membuat orang berhenti membuka aplikasinya sama sekali.
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  onAPIError: {
    /**
     * Galat dibawa ke halaman masuk, bukan ke halaman galat bawaan pustaka.
     *
     * Yang bawaan menampilkan kode mentah seperti `signup_disabled` di atas
     * kotak "Something went wrong" berbahasa Inggris — dan orang yang membacanya
     * bukan orang teknis. Penolakan yang tidak menyebut sebabnya membuat orang
     * mencoba berkali-kali, lalu menyangka aplikasinya rusak.
     */
    errorURL: "/masuk",
  },

  // Harus paling akhir: plugin ini yang menuliskan cookie dari dalam Server
  // Action dan Route Handler Next.
  plugins: [nextCookies()],
});
