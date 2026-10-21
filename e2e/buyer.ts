import type { Locator, Page } from "@playwright/test";

/**
 * Picks "+ Pembeli baru…" in the sale form and fills the buyer in.
 *
 * Every spec that sells used to type a buyer's name into a free text box;
 * since buyers are a list, the same one step is "a new buyer, with the
 * location and kind every buyer now needs".
 */
export async function chooseNewBuyer(
  where: Page | Locator,
  name: string,
  { location = "E2E Pasar Uji", kind = "PENGEPUL", whatsapp = "" } = {}
) {
  // Always within the sale dialog: the Panen page also has a "Pembeli" tab,
  // and a page-wide label lookup finds both.
  const scope = "goto" in where ? where.getByRole("dialog") : where;

  await scope
    .getByLabel("Pembeli", { exact: true })
    .selectOption({ label: "+ Pembeli baru…" });
  await scope.getByLabel("Nama pembeli", { exact: true }).fill(name);
  await scope.getByLabel("Lokasi", { exact: true }).fill(location);
  await scope.getByLabel("Jenis", { exact: true }).selectOption(kind);
  if (whatsapp) {
    await scope.getByLabel("No. WhatsApp (opsional)", { exact: true }).fill(whatsapp);
  }
}
