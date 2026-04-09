import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../src/routes/api/events/+server";
import { json } from "@sveltejs/kit";

// Mock dependencies
vi.mock("@sveltejs/kit", () => ({
  json: vi.fn((data, options) => ({ data, options })),
}));

vi.mock("$lib/server/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("$lib/server/db/utils", () => ({
  generateUniqueShareCode: vi.fn(() => Promise.resolve("ABC123")),
}));

import { getDb } from "$lib/server/db";
import { generateUniqueShareCode } from "$lib/server/db/utils";

describe("POST /api/events - Event Creation", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: "evt_123",
                name: "Test Event",
                date: new Date("2026-12-31"),
                location: "Test Location",
                description: "Test Description",
                hostName: "Test Host",
                hostDeviceId: "device_123",
                shareCode: "ABC123",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          ),
        })),
      })),
    };

    vi.mocked(getDb).mockReturnValue(mockDb);
  });

  describe("Happy Path", () => {
    it("should create event with all fields", async () => {
      const request = {
        json: async () => ({
          name: "Test Event",
          date: "2026-12-31T18:00:00.000Z",
          location: "Test Location",
          description: "Test Description",
          hostName: "Test Host",
          hostDeviceId: "device_123",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.data).toEqual({
        id: "evt_123",
        shareCode: "ABC123",
        event: expect.objectContaining({
          name: "Test Event",
          shareCode: "ABC123",
        }),
      });
      expect(response.options?.status).toBe(201);
    });

    it("should create event without optional fields", async () => {
      const request = {
        json: async () => ({
          name: "Minimal Event",
          date: "2026-12-31T18:00:00.000Z",
          hostName: "Host",
          hostDeviceId: "device_123",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.options?.status).toBe(201);
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should generate unique share code", async () => {
      const request = {
        json: async () => ({
          name: "Test Event",
          date: "2026-12-31T18:00:00.000Z",
          hostName: "Host",
          hostDeviceId: "device_123",
        }),
      };

      await POST({ request } as any);

      expect(generateUniqueShareCode).toHaveBeenCalled();
    });

    it("should auto-create host participant", async () => {
      const request = {
        json: async () => ({
          name: "Test Event",
          date: "2026-12-31T18:00:00.000Z",
          hostName: "Host",
          hostDeviceId: "device_123",
        }),
      };

      await POST({ request } as any);

      // Verify participant insert was called
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // event + participant
    });
  });

  describe("Validation", () => {
    it("should reject missing name", async () => {
      const request = {
        json: async () => ({
          date: "2026-12-31T18:00:00.000Z",
          hostName: "Host",
          hostDeviceId: "device_123",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.options?.status).toBe(400);
      expect(response.data.error).toContain("Missing required fields");
    });

    it("should reject missing date", async () => {
      const request = {
        json: async () => ({
          name: "Test Event",
          hostName: "Host",
          hostDeviceId: "device_123",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.options?.status).toBe(400);
    });

    it("should reject missing hostName", async () => {
      const request = {
        json: async () => ({
          name: "Test Event",
          date: "2026-12-31T18:00:00.000Z",
          hostDeviceId: "device_123",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.options?.status).toBe(400);
    });

    it("should reject missing hostDeviceId", async () => {
      const request = {
        json: async () => ({
          name: "Test Event",
          date: "2026-12-31T18:00:00.000Z",
          hostName: "Host",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.options?.status).toBe(400);
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockDb.insert = vi.fn(() => {
        throw new Error("Database connection failed");
      });

      const request = {
        json: async () => ({
          name: "Test Event",
          date: "2026-12-31T18:00:00.000Z",
          hostName: "Host",
          hostDeviceId: "device_123",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.options?.status).toBe(500);
      expect(response.data.error).toContain("Failed to create event");
    });

    it("should handle share code generation failure", async () => {
      vi.mocked(generateUniqueShareCode).mockRejectedValueOnce(
        new Error("Max attempts exceeded"),
      );

      const request = {
        json: async () => ({
          name: "Test Event",
          date: "2026-12-31T18:00:00.000Z",
          hostName: "Host",
          hostDeviceId: "device_123",
        }),
      };

      const response = await POST({ request } as any);

      expect(response.options?.status).toBe(500);
    });
  });
});
