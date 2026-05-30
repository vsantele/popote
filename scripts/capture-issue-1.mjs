// One-off visual-evidence capture for issue #1 (real-time shared list).
// Drives two independent browser contexts against the running dev server:
// adds an item in session B and shows it appear live in session A.
//
// Run: node scripts/capture-issue-1.mjs http://localhost:5173 ABC123
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:5173";
const code = process.argv[3];
if (!code) {
  console.error("usage: node scripts/capture-issue-1.mjs <baseUrl> <shareCode>");
  process.exit(1);
}
const outDir = "docs/screenshots/issue-1";
mkdirSync(outDir, { recursive: true });

const eventUrl = `${base}/e/${code}`;

async function waitStatus(page, status, timeout = 15000) {
  await page.waitForFunction(
    (s) =>
      document.querySelector("[data-live-status]")?.getAttribute("data-live-status") === s,
    status,
    { timeout },
  );
}

/** Open the event; if redirected to /join, pick a name and continue. */
async function openBoard(page, name) {
  await page.goto(eventUrl, { waitUntil: "networkidle" });
  if (page.url().includes("/join")) {
    await page.getByRole("textbox").first().fill(name);
    await page.getByRole("button", { name: /Rejoindre|Join/i }).click();
    await page.waitForURL(/\/e\//);
  }
}

const browser = await chromium.launch();
try {
  // Two separate contexts = two separate guests (separate cookies/sessions).
  const ctxA = await browser.newContext({ locale: "fr-FR", viewport: { width: 430, height: 900 } });
  const ctxB = await browser.newContext({ locale: "fr-FR", viewport: { width: 430, height: 900 } });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();

  // Session A: open the board and wait for the live channel to connect.
  await openBoard(a, "Alex");
  await waitStatus(a, "connected");
  await a.screenshot({ path: `${outDir}/01-session-a-connected.png` });
  console.log("captured 01-session-a-connected.png (live pulse = connected)");

  // Session B: join the same event, then add an item.
  await openBoard(b, "Camille");
  await waitStatus(b, "connected");
  await b.getByRole("button", { name: /Ajouter un item/i }).click();
  await b.getByRole("textbox", { name: /Nom de l'item/i }).fill("Salade César");
  await b.getByRole("button", { name: /^Ajouter$/ }).click();
  await b.waitForSelector("text=Salade César");
  await b.screenshot({ path: `${outDir}/02-session-b-added.png` });
  console.log("captured 02-session-b-added.png (guest B added an item)");

  // Session A: WITHOUT any manual refresh, the item should arrive live.
  await a.waitForSelector("text=Salade César", { timeout: 10000 });
  await a.screenshot({ path: `${outDir}/03-session-a-live-update.png` });
  console.log("captured 03-session-a-live-update.png (appeared live in A, no refresh)");

  await browser.close();
  console.log("done");
} catch (err) {
  await browser.close();
  console.error("capture failed:", err);
  process.exit(1);
}
