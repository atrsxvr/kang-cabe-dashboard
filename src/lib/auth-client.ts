"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Sisi peramban dari otentikasi. Dipakai satu tombol saja — memulai alur Google
 * dan keluar — jadi tidak ada konfigurasi: `baseURL` dibiarkan kosong supaya ia
 * memakai asal halaman yang sedang dibuka, yang benar baik di localhost maupun
 * di produksi tanpa satu variabel tambahan.
 */
export const authClient = createAuthClient();
