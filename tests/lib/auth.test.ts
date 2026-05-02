import { describe, it, expect, beforeEach, vi } from "vite-plus/test";
import { getDeviceId, clearDeviceId } from "../../src/lib/auth";

// Mock $app/environment
vi.mock("$app/environment", () => ({
  browser: true,
}));

describe("Device ID Generation and Persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = "";
  });

  describe("getDeviceId()", () => {
    it("should generate a new device ID if none exists", () => {
      const deviceId = getDeviceId();

      expect(deviceId).toBeDefined();
      expect(deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it("should persist device ID to localStorage", () => {
      const deviceId = getDeviceId();

      const stored = localStorage.getItem("popote_device_id");
      expect(stored).toBe(deviceId);
    });

    it("should sync device ID to cookie", () => {
      const deviceId = getDeviceId();

      expect(document.cookie).toContain(`popote_device_id=${deviceId}`);
      expect(document.cookie).toContain("path=/");
      expect(document.cookie).toContain("max-age=31536000");
      expect(document.cookie).toContain("SameSite=Lax");
    });

    it("should return existing device ID if already stored", () => {
      const firstId = getDeviceId();
      const secondId = getDeviceId();

      expect(firstId).toBe(secondId);
    });

    it("should return empty string in SSR mode (browser=false)", async () => {
      // Re-import with browser=false
      vi.resetModules();
      vi.doMock("$app/environment", () => ({
        browser: false,
      }));

      const { getDeviceId: ssrGetDeviceId } =
        await import("../../src/lib/auth");
      const deviceId = ssrGetDeviceId();

      expect(deviceId).toBe("");
    });

    it("should handle UUID generation edge cases", () => {
      // Generate multiple IDs to ensure uniqueness
      const ids = new Set();
      for (let i = 0; i < 10; i++) {
        localStorage.clear();
        ids.add(getDeviceId());
      }

      expect(ids.size).toBe(10); // All unique
    });
  });

  describe("clearDeviceId()", () => {
    it("should remove device ID from localStorage", () => {
      getDeviceId(); // Generate first
      clearDeviceId();

      const stored = localStorage.getItem("popote_device_id");
      expect(stored).toBeNull();
    });

    it("should clear device ID cookie", () => {
      getDeviceId(); // Generate first
      clearDeviceId();

      expect(document.cookie).toContain("popote_device_id=");
      expect(document.cookie).toContain("max-age=0");
    });

    it("should do nothing in SSR mode (browser=false)", async () => {
      vi.resetModules();
      vi.doMock("$app/environment", () => ({
        browser: false,
      }));

      const { clearDeviceId: ssrClearDeviceId } = await import("./auth");

      // Should not throw
      expect(() => ssrClearDeviceId()).not.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle localStorage quota exceeded gracefully", () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error("QuotaExceededError");
      });

      // Should not crash, but may not persist
      expect(() => getDeviceId()).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it("should handle corrupted device ID in localStorage", () => {
      localStorage.setItem("popote_device_id", "invalid-uuid-format");

      const deviceId = getDeviceId();

      // Should return the stored value even if format is invalid
      // (Our code doesn't validate, it just retrieves)
      expect(deviceId).toBe("invalid-uuid-format");
    });
  });
});
