import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Chooses a material in a MaterialCombobox: types part of its name, then taps
 * it in the list — the way it is done on a phone.
 */
export async function pickMaterial(scope: Page | Locator, label: string, name: string) {
  const input = scope.getByLabel(label, { exact: true });
  await input.click();
  await input.fill(name);
  const page = "page" in scope ? scope.page() : scope;
  const option = page.getByRole("listbox").getByRole("option", { name: new RegExp(`^${name}`) });
  await expect(option).toHaveCount(1);
  await option.click();
  await expect(input).toHaveValue(name);
}
