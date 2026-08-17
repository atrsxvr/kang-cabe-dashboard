import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    DATABASE_URL: "postgresql://postgres.abc:pass@host:6543/postgres",
    SUPABASE_URL: "https://abc.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_contoh_bukan_jwt",
    NODE_ENV: "test",
  }),
  deriveSupabaseUrl: () => "https://abc.supabase.co",
}));

const { uploadPhoto, deletePhoto } = await import("@/server/storage");

/**
 * Satu header yang pernah hilang, dan gejalanya menyesatkan.
 *
 * Kunci Supabase model baru (`sb_secret_…`) bukan JWT. Dikirim cuma sebagai
 * `Authorization: Bearer`, Storage mencoba memecahnya sebagai JWT dan menolak
 * dengan `403 "Invalid Compact JWS"` — pesan yang tidak menyebut sepatah kata
 * pun soal bentuk kunci, jadi ia terbaca seperti kunci yang salah tempel.
 * Berjam-jam bisa habis mencari di tempat yang keliru.
 *
 * Tes ini memeriksa header yang benar-benar dikirim, bukan hasil akhirnya,
 * karena hasil akhirnya cuma bisa dibuktikan dengan menembak Supabase sungguhan.
 */
describe("header ke Supabase Storage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => "" });
    vi.stubGlobal("fetch", fetchMock);
  });

  const headersOf = (call: number) =>
    (fetchMock.mock.calls[call][1] as { headers: Record<string, string> })
      .headers;

  it("sends the key as apikey as well as Bearer when uploading", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.png", {
      type: "image/png",
    });

    await uploadPhoto(file);

    const headers = headersOf(0);
    expect(headers.apikey).toBe("sb_secret_contoh_bukan_jwt");
    expect(headers.Authorization).toBe("Bearer sb_secret_contoh_bukan_jwt");
  });

  /**
   * Menghapus dulu cuma mengirim Bearer, dan itu terlewat karena unggahnya yang
   * diperbaiki. Berkas yatim tidak menimbulkan galat yang dilihat siapa pun —
   * ia cuma menumpuk.
   */
  it("sends both headers when deleting too", async () => {
    await deletePhoto(
      "https://abc.supabase.co/storage/v1/object/public/health-photos/2026/x.png"
    );

    const headers = headersOf(0);
    expect(headers.apikey).toBe("sb_secret_contoh_bukan_jwt");
    expect(headers.Authorization).toBe("Bearer sb_secret_contoh_bukan_jwt");
  });

  it("rejects a format the bucket does not allow, before spending a request", async () => {
    const file = new File([new Uint8Array([1])], "a.gif", { type: "image/gif" });

    const result = await uploadPhoto(file);

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
