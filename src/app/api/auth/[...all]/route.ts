import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/server/auth/config";

/**
 * Semua endpoint better-auth: mulai OAuth, callback dari Google, keluar, dan
 * baca sesi. Satu berkas, karena pustakanya yang memutuskan rutenya — bukan
 * kita — dan menyalin daftarnya ke sini cuma menambah satu tempat yang bisa
 * ketinggalan versi.
 */
export const { GET, POST } = toNextJsHandler(auth);
