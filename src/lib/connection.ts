/**
 * Where a failure is, in words the person holding the phone can act on.
 *
 * A production build hides every server error from the browser — the error
 * boundary gets a digest and nothing else — so the page cannot read what went
 * wrong. It finds out instead: is this phone online, does the server answer,
 * does the database answer. Each step that fails points at a different person
 * and a different fix, and "Gagal memuat data" pointed at nobody.
 */

/** How a database connection failed, read off the driver's error. */
export type DbProblem =
  | "paused"
  | "busy"
  | "auth"
  | "unreachable"
  | "timeout"
  | "unknown";

export type Diagnosis =
  | { where: "checking" }
  | { where: "offline" }
  | { where: "server-unreachable" }
  | { where: "server-error"; status: number }
  | { where: "database"; problem: DbProblem }
  | { where: "app" };

/** Every message, code and cause in an error chain, as one searchable string. */
function haystack(error: unknown, depth = 0): string {
  if (error === null || error === undefined || depth > 4) return "";
  if (typeof error !== "object") return String(error);

  const record = error as Record<string, unknown>;
  const parts = [record.message, record.code, record.kind, record.originalCode]
    .filter((part) => part !== undefined)
    .map(String);

  // Prisma's driver adapters tuck the Postgres error under `meta` and `cause`.
  if (record.meta) {
    try {
      parts.push(JSON.stringify(record.meta));
    } catch {
      // A circular meta is not worth failing a diagnosis over.
    }
  }
  parts.push(haystack(record.cause, depth + 1));

  return parts.join(" ");
}

/**
 * Sorts a database failure into the few causes that need different handling.
 *
 * Order matters. Supabase's pooler reports a project it cannot wake as
 * "(EAUTHQUERY) authentication query failed: connection to database not
 * available" — which contains "authentication", but is not a wrong password,
 * so paused is checked first. A pool timeout says "Timed out", but it is a
 * full pool rather than a slow database, so busy comes before timeout.
 */
export function classifyDbError(error: unknown): DbProblem {
  const text = haystack(error);

  if (
    /EAUTHQUERY|connection to database not available|Tenant or user not found|project is paused/i.test(
      text
    )
  ) {
    return "paused";
  }
  if (
    /\b53300\b|too many (clients|connections)|EMAXCONN|max client connections|\bP2024\b|Timed out fetching a new connection/i.test(
      text
    )
  ) {
    return "busy";
  }
  if (/\b28P01\b|\b28000\b|password authentication failed|\bP1000\b/i.test(text)) {
    return "auth";
  }
  if (
    /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|getaddrinfo|\bP1001\b|Can't reach database|DatabaseNotReachable/i.test(
      text
    )
  ) {
    return "unreachable";
  }
  if (/ETIMEDOUT|timed? ?out|\bP1008\b/i.test(text)) return "timeout";

  return "unknown";
}

export type DiagnosisMessage = {
  title: string;
  /** Where the problem is — the one thing this page exists to say. */
  where: string;
  /** What can be done about it, by whom. */
  steps: string[];
};

const dbMessages: Record<DbProblem, DiagnosisMessage> = {
  paused: {
    title: "Database sedang tidak aktif",
    where:
      "Server aplikasi jalan, tapi project database di Supabase sedang di-pause atau belum menyala.",
    steps: [
      "Buka dashboard Supabase dan lihat apakah project-nya di-pause. Kalau iya, tekan Restore.",
      "Project gratis yang lama tidak dipakai di-pause otomatis oleh Supabase.",
      "Setelah aktif lagi, tunggu 1–2 menit lalu coba lagi.",
    ],
  },
  busy: {
    title: "Database sedang penuh",
    where:
      "Server aplikasi dan database jalan, tapi koneksi ke database sedang habis terpakai.",
    steps: [
      "Tunggu sebentar, lalu coba lagi — biasanya pulih sendiri dalam semenit.",
      "Kalau sering terjadi, sampaikan ke Admin: batas koneksi database perlu diperiksa.",
    ],
  },
  auth: {
    title: "Server ditolak oleh database",
    where:
      "Server aplikasi jalan, tapi database menolak masuk — kata sandi atau alamat database di pengaturan server salah.",
    steps: [
      "Ini bukan masalah HP-mu. Sampaikan ke Admin.",
      "Admin: periksa DATABASE_URL di pengaturan Vercel, terutama setelah kata sandi database diganti.",
    ],
  },
  unreachable: {
    title: "Database tidak bisa dihubungi",
    where:
      "Server aplikasi jalan, tapi tidak bisa tersambung ke database Supabase.",
    steps: [
      "Cek status Supabase (status.supabase.com) dan dashboard project-nya.",
      "Coba lagi dalam beberapa menit — gangguan seperti ini biasanya sementara.",
    ],
  },
  timeout: {
    title: "Database terlalu lambat menjawab",
    where:
      "Server aplikasi jalan, tapi database tidak menjawab dalam beberapa detik.",
    steps: [
      "Coba lagi sebentar lagi.",
      "Kalau terus berulang, cek dashboard Supabase — mungkin sedang ada gangguan.",
    ],
  },
  unknown: {
    title: "Database bermasalah",
    where:
      "Server aplikasi jalan, tapi database mengembalikan kesalahan yang tidak dikenali.",
    steps: [
      "Coba lagi sebentar lagi.",
      "Kalau berulang, kirim kode di bawah ke Admin.",
    ],
  },
};

export function describeDiagnosis(diagnosis: Diagnosis): DiagnosisMessage {
  switch (diagnosis.where) {
    case "checking":
      return {
        title: "Memeriksa koneksi…",
        where: "Sebentar, sedang dicek di mana masalahnya.",
        steps: [],
      };
    case "offline":
      return {
        title: "HP-mu tidak tersambung ke internet",
        where:
          "Masalahnya di jaringan HP-mu, bukan di aplikasi atau server.",
        steps: [
          "Cek sinyal, WiFi, atau kuota data.",
          "Halaman ini mencoba lagi sendiri begitu HP tersambung.",
        ],
      };
    case "server-unreachable":
      return {
        title: "Server aplikasi tidak bisa dihubungi",
        where:
          "HP-mu tersambung ke internet, tapi server aplikasi tidak menjawab.",
        steps: [
          "Coba lagi dalam beberapa menit — server bisa sedang di-deploy ulang.",
          "Kalau internetmu lambat atau dibatasi, coba ganti jaringan (WiFi ↔ data).",
          "Kalau lebih dari 15 menit, sampaikan ke Admin untuk cek Vercel.",
        ],
      };
    case "server-error":
      return {
        title: "Server aplikasi sedang bermasalah",
        where: `Server aplikasi menjawab, tapi dengan kesalahan (${diagnosis.status}) — biasanya pengaturan server.`,
        steps: [
          "Ini bukan masalah HP-mu. Sampaikan ke Admin.",
          "Admin: lihat log deployment terbaru di Vercel.",
        ],
      };
    case "database":
      return dbMessages[diagnosis.problem];
    case "app":
      return {
        title: "Ada kesalahan di halaman ini",
        where:
          "Internet, server, dan database semuanya baik. Kesalahannya ada di halaman ini sendiri.",
        steps: [
          "Coba muat ulang halaman.",
          "Kalau berulang, kirim kode di bawah ke Admin beserta halaman yang dibuka.",
        ],
      };
  }
}

/** What `/api/health` answers. Deliberately carries no error text. */
export type HealthReport = {
  server: "ok";
  database: { ok: true; ms: number } | { ok: false; problem: DbProblem };
};
