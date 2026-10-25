import { describe, it, expect } from "vite-plus/test";
import fs from "node:fs";
import path from "node:path";

describe("PWA and Favicon standard compliance", () => {
  const rootDir = process.cwd();
  const staticDir = path.join(rootDir, "static");
  const manifestPath = path.join(staticDir, "manifest.json");

  it("manifest.json exists and is valid JSON", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    expect(manifest.name).toBe("Popote");
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
    expect(manifest.display).toBe("standalone");
  });

  it("manifest.json defines PWA standard icons for any and maskable purposes", () => {
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);
    const icons = manifest.icons;
    expect(Array.isArray(icons)).toBe(true);

    // Must have 192x192 and 512x512 icons
    const icon192 = icons.find(
      (i: { sizes: string; purpose?: string }) =>
        i.sizes === "192x192" &&
        (i.purpose === "any" || i.purpose === "any maskable" || !i.purpose),
    );
    const icon512 = icons.find(
      (i: { sizes: string; purpose?: string }) =>
        i.sizes === "512x512" &&
        (i.purpose === "any" || i.purpose === "any maskable" || !i.purpose),
    );
    const iconMaskable = icons.find(
      (i: { purpose?: string }) =>
        i.purpose === "maskable" || i.purpose === "any maskable",
    );

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(iconMaskable).toBeDefined();
  });

  it("required favicon and PWA icon files exist in static/", () => {
    const requiredFiles = [
      "favicon.svg",
      "favicon.ico",
      "favicon-16x16.png",
      "favicon-32x32.png",
      "favicon.png",
      "apple-touch-icon.png",
      "icon-192.png",
      "icon-512.png",
      "icon-maskable-192.png",
      "icon-maskable-512.png",
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(staticDir, file);
      expect(fs.existsSync(filePath), `Missing ${file}`).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it("src/lib/assets/favicon.svg contains the Popote brand pot (not default svelte logo)", () => {
    const faviconSvgPath = path.join(
      rootDir,
      "src",
      "lib",
      "assets",
      "favicon.svg",
    );
    expect(fs.existsSync(faviconSvgPath)).toBe(true);
    const content = fs.readFileSync(faviconSvgPath, "utf-8");
    expect(content).not.toContain("svelte-logo");
    expect(content).toContain("steam");
    expect(content).toContain("pot body");
  });
});
