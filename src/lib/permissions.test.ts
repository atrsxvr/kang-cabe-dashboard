import { describe, expect, it } from "vitest";

import {
  AREAS,
  ROLES,
  canWrite,
  denialMessage,
  writableAreas,
  type Area,
} from "@/lib/permissions";

describe("canWrite", () => {
  /**
   * Permintaan yang disampaikan terang-terangan: Admin perlu bisa menutupi
   * pekerjaan yang tertinggal saat temannya tidak bisa mengisi sendiri.
   *
   * Ditulis sebagai perulangan atas `AREAS`, bukan sebagai daftar, supaya
   * wilayah yang ditambahkan berbulan-bulan dari sekarang ikut terjaga. Wilayah
   * baru yang lupa memasukkan Admin akan membuat tes ini merah pada hari ia
   * ditulis, bukan pada hari Admin membutuhkannya.
   */
  it("lets Admin write everywhere, including areas added later", () => {
    for (const area of AREAS) {
      expect(canWrite("ADMIN", area), `Admin terkunci dari ${area}`).toBe(true);
    }
  });

  it("keeps each role in its own patch", () => {
    expect(canWrite("AGRONOMIST", "recipes")).toBe(true);
    expect(canWrite("AGRONOMIST", "inventory")).toBe(false);

    expect(canWrite("LOGISTICS", "inventory")).toBe(true);
    expect(canWrite("LOGISTICS", "harvest")).toBe(false);

    expect(canWrite("SALES", "harvest")).toBe(true);
    expect(canWrite("SALES", "tasks")).toBe(false);
  });

  /**
   * Menyusun jadwal adalah membagi pekerjaan orang lain, dan itu keputusan satu
   * orang setelah berunding — bukan sesuatu yang diubah masing-masing sendiri di
   * lapangan. Agronomis sempat punya izin ini sampai dikoreksi.
   */
  it("leaves the schedule to Admin alone", () => {
    for (const role of ROLES) {
      expect(canWrite(role, "tasks")).toBe(role === "ADMIN");
    }
  });

  /**
   * Tapi susut dibuka untuk semua, dan itu bukan kelonggaran yang lupa
   * ditutup. Yang menemukan tumpukan membusuk bisa Agronomis yang lewat atau
   * Logistik yang menata gudang — dan susut yang tidak tercatat membuat sisa
   * stok terus melar sampai angkanya jauh dari tumpukan yang benar-benar ada.
   *
   * Mencatat kehilangan juga tidak bisa dipakai menguntungkan diri sendiri.
   */
  it("lets anyone record what rotted", () => {
    for (const role of ROLES) {
      expect(canWrite(role, "losses"), `${role} nggak bisa catat susut`).toBe(
        true
      );
    }
  });

  /**
   * Dan susut terpisah dari penjualan, yang tetap milik Sales. Kalau keduanya
   * satu wilayah, membuka susut ikut membuka penjualan.
   */
  it("does not let recording losses become permission to sell", () => {
    expect(canWrite("LOGISTICS", "losses")).toBe(true);
    expect(canWrite("LOGISTICS", "harvest")).toBe(false);

    expect(canWrite("AGRONOMIST", "losses")).toBe(true);
    expect(canWrite("AGRONOMIST", "harvest")).toBe(false);
  });

  /**
   * Siapa pun yang keliling kebun boleh melaporkan apa yang dilihat. Menutup
   * ini berarti temuan yang dilihat Logistik tidak pernah sampai ke Agronomis —
   * dan seluruh alur Kesehatan dibangun atas anggapan sebaliknya.
   */
  it("lets anyone report what they saw in the garden", () => {
    for (const role of ROLES) {
      expect(canWrite(role, "findings"), `${role} nggak bisa lapor`).toBe(true);
    }
  });

  /**
   * Tapi menegakkan diagnosa bukan pekerjaan yang sama. Satu halaman memuat
   * keduanya, dan memberi keduanya satu izin akan salah ke salah satu arah.
   */
  it("separates reporting a finding from diagnosing it", () => {
    expect(canWrite("LOGISTICS", "findings")).toBe(true);
    expect(canWrite("LOGISTICS", "diagnosis")).toBe(false);

    expect(canWrite("SALES", "findings")).toBe(true);
    expect(canWrite("SALES", "diagnosis")).toBe(false);
  });

  /** Uang dan konfigurasi cuma Admin — termasuk setoran modal tiap orang. */
  it("keeps money and configuration with Admin alone", () => {
    for (const area of ["finance", "capital", "settings", "seasons"] as const) {
      for (const role of ROLES) {
        expect(canWrite(role, area)).toBe(role === "ADMIN");
      }
    }
  });

  /**
   * Tidak ada wilayah yang tidak bisa ditulis siapa pun. Wilayah seperti itu
   * adalah fitur yang mati tanpa ada yang menyadarinya.
   */
  it("leaves no area with nobody able to write in it", () => {
    for (const area of AREAS) {
      const writers = ROLES.filter((role) => canWrite(role, area));
      expect(writers.length, `${area} nggak ada yang bisa nulis`).toBeGreaterThan(0);
    }
  });
});

describe("writableAreas", () => {
  it("gives Admin every area", () => {
    expect(writableAreas("ADMIN")).toEqual([...AREAS]);
  });

  it("gives each other role a smaller list than Admin", () => {
    for (const role of ROLES.filter((row) => row !== "ADMIN")) {
      expect(writableAreas(role).length).toBeLessThan(AREAS.length);
    }
  });
});

describe("denialMessage", () => {
  /**
   * "Kamu tidak punya akses" membuat orang berhenti dan bertanya-tanya.
   * Menyebut perannya mengubah jalan buntu jadi arahan.
   */
  it("names who to ask instead of just refusing", () => {
    expect(denialMessage("inventory")).toContain("Logistik");
    expect(denialMessage("recipes")).toContain("Agronomis");
  });

  it("says Admin plainly when nobody else can write there", () => {
    expect(denialMessage("finance")).toBe(
      "Cuma Admin yang bisa mengubah bagian ini."
    );
  });

  /** Tiap wilayah punya kalimatnya, jadi tidak ada penolakan yang kosong. */
  it("has something to say for every area", () => {
    for (const area of AREAS) {
      expect(denialMessage(area as Area).length).toBeGreaterThan(10);
    }
  });
});
