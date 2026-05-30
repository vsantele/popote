import { test, expect, type Page } from "@playwright/test";

// Helpers ──────────────────────────────────────────────────────────────────

/** Create an event as the host and return its share code. */
async function createEvent(page: Page, name: string): Promise<string> {
  await page.goto("/create");
  await page.locator("#host_name").fill("Nico");
  await page.locator("#name").fill(name);
  await page.locator("#date").fill("2026-07-18T19:30");
  await page.locator("#location").fill("12 rue de la Paix, Paris");
  await page.locator('form button[type="submit"]').click();

  await page.waitForURL(/\/e\/[A-Z0-9]+/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  const code = page.url().split("/e/")[1].split(/[/?#]/)[0];
  expect(code).toMatch(/^[A-Z0-9]+$/);
  return code;
}

/** Add a contribution via the dialog. Defaults to the "Plat" category. */
async function addItem(
  page: Page,
  name: string,
  options: { category?: string; quantity?: string } = {},
): Promise<void> {
  await page.getByRole("button", { name: /Ajouter un item/i }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator("#name").fill(name);

  if (options.category) {
    await dialog.locator('[data-slot="select-trigger"]').click();
    await page
      .getByRole("option", { name: new RegExp(options.category, "i") })
      .click();
  }
  if (options.quantity) {
    await dialog.locator("#quantity").fill(options.quantity);
  }

  await dialog.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

// Tests ──────────────────────────────────────────────────────────────────--

test("home page shows create and join entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Popote" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Créer une soirée/i }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("ABC123")).toBeVisible();
});

test("host creates an event and lands on an empty board", async ({ page }) => {
  await createEvent(page, "Pique-nique au parc");

  // The empty state, not a 500 — this is the exact path the db.query
  // regression broke.
  await expect(page.getByText(/Aucun item pour le moment/i)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Ajouter un item/i }),
  ).toBeVisible();
});

test("host adds items and the board groups them by course", async ({
  page,
}) => {
  await createEvent(page, "Barbecue chez Nico");

  await addItem(page, "Côtes de bœuf", { quantity: "pour 8" }); // default: Plat
  await addItem(page, "Rosé bien frais", { category: "Apéro" });

  // Both course sections are present with their items.
  await expect(page.getByRole("heading", { name: "Plat" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Apéro" })).toBeVisible();
  await expect(page.getByText("Côtes de bœuf")).toBeVisible();
  await expect(page.getByText("Rosé bien frais")).toBeVisible();
  await expect(page.getByText(/Par Nico/).first()).toBeVisible();

  // The "still missing" hint surfaces empty essential courses, but not the
  // ones we just filled.
  const gap = page.getByText(/Il manque encore/i).locator("..");
  await expect(gap).toBeVisible();
  await expect(gap.getByText("Dessert")).toBeVisible();
  await expect(gap.getByText("Plat")).toHaveCount(0);
});

test("the board can be regrouped by person", async ({ page }) => {
  await createEvent(page, "Repas de famille");
  await addItem(page, "Tarte aux pommes", { category: "Dessert" });

  await page.getByRole("radio", { name: /Par personne/i }).click();

  await expect(page.getByRole("heading", { name: "Nico" })).toBeVisible();
  await expect(page.getByText("Tarte aux pommes")).toBeVisible();
});

test("a guest can join with the code and the host sees their item on refresh", async ({
  browser,
}) => {
  // Host creates the event and adds the main dish.
  const hostContext = await browser.newContext({ locale: "fr-FR" });
  const hostPage = await hostContext.newPage();
  const code = await createEvent(hostPage, "Soirée partagée");
  await addItem(hostPage, "Gigot d'agneau");

  // A separate guest (separate anonymous session) joins via the code.
  const guestContext = await browser.newContext({ locale: "fr-FR" });
  const guestPage = await guestContext.newPage();
  await guestPage.goto("/");
  await guestPage.locator("#shareCode").fill(code);
  await guestPage.getByRole("button", { name: /Rejoindre/i }).click();

  await guestPage.waitForURL(new RegExp(`/join/${code}`, "i"));
  await guestPage.locator("#name").fill("Camille");
  await guestPage.locator('form button[type="submit"]').click();
  await guestPage.waitForURL(new RegExp(`/e/${code}`, "i"));

  await addItem(guestPage, "Mousse au chocolat", { category: "Dessert" });

  // Back on the host: refresh and confirm the shared list now includes the
  // guest's contribution and counts both people.
  await hostPage.getByRole("button", { name: /Actualiser/i }).click();
  await expect(hostPage.getByText("Mousse au chocolat")).toBeVisible();
  await expect(hostPage.getByText(/2 à table/)).toBeVisible();

  await guestContext.close();
  await hostContext.close();
});
