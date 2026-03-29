import { describe, it, expect, vi, beforeEach } from "vitest"
import { POST } from "../../src/routes/api/items/+server"

vi.mock("@sveltejs/kit", () => ({
  json: vi.fn((data, options) => ({ data, options })),
}))

vi.mock("$lib/server/db", () => ({
  getDb: vi.fn(),
}))

import { getDb } from "$lib/server/db"

describe("POST /api/items - Add Item", () => {
  let mockDb: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockDb = {
      query: {
        participants: {
          findFirst: vi.fn(() =>
            Promise.resolve({
              id: "prt_123",
              eventId: "evt_123",
              name: "Test User",
              deviceId: "device_123",
              isHost: false,
            }),
          ),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() =>
            Promise.resolve([
              {
                id: "itm_123",
                eventId: "evt_123",
                participantId: "prt_123",
                name: "Pizza",
                category: "plat",
                quantity: "2",
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          ),
        })),
      })),
    }

    vi.mocked(getDb).mockReturnValue(mockDb)
  })

  describe("Happy Path", () => {
    it("should add item with all fields", async () => {
      const request = {
        json: async () => ({
          eventId: "evt_123",
          name: "Pizza",
          category: "plat",
          quantity: "2",
          deviceId: "device_123",
        }),
      }

      const response = await POST({ request } as any)

      expect(response.options?.status).toBe(201)
      expect(response.data.item).toEqual(
        expect.objectContaining({
          name: "Pizza",
          category: "plat",
          quantity: "2",
        }),
      )
    })

    it("should add item without quantity", async () => {
      const request = {
        json: async () => ({
          eventId: "evt_123",
          name: "Salade",
          category: "entree",
          deviceId: "device_123",
        }),
      }

      const response = await POST({ request } as any)

      expect(response.options?.status).toBe(201)
    })

    it("should verify participant exists", async () => {
      const request = {
        json: async () => ({
          eventId: "evt_123",
          name: "Pizza",
          category: "plat",
          deviceId: "device_123",
        }),
      }

      await POST({ request } as any)

      expect(mockDb.query.participants.findFirst).toHaveBeenCalled()
    })
  })

  describe("Validation", () => {
    it("should reject missing eventId", async () => {
      const request = {
        json: async () => ({
          name: "Pizza",
          category: "plat",
          deviceId: "device_123",
        }),
      }

      const response = await POST({ request } as any)

      expect(response.options?.status).toBe(400)
      expect(response.data.error).toContain("Missing required fields")
    })

    it("should reject missing name", async () => {
      const request = {
        json: async () => ({
          eventId: "evt_123",
          category: "plat",
          deviceId: "device_123",
        }),
      }

      const response = await POST({ request } as any)

      expect(response.options?.status).toBe(400)
    })

    it("should reject invalid category", async () => {
      const request = {
        json: async () => ({
          eventId: "evt_123",
          name: "Pizza",
          category: "invalid_category",
          deviceId: "device_123",
        }),
      }

      const response = await POST({ request } as any)

      expect(response.options?.status).toBe(400)
      expect(response.data.error).toContain("Invalid category")
    })

    it("should accept all valid categories", async () => {
      const categories = [
        "apero",
        "entree",
        "plat",
        "dessert",
        "boissons",
        "jeux",
        "autre",
      ]

      for (const category of categories) {
        const request = {
          json: async () => ({
            eventId: "evt_123",
            name: "Test Item",
            category,
            deviceId: "device_123",
          }),
        }

        const response = await POST({ request } as any)
        expect(response.options?.status).toBe(201)
      }
    })
  })

  describe("Authorization", () => {
    it("should reject if user is not a participant", async () => {
      mockDb.query.participants.findFirst = vi.fn(() => Promise.resolve(null))

      const request = {
        json: async () => ({
          eventId: "evt_123",
          name: "Pizza",
          category: "plat",
          deviceId: "device_999",
        }),
      }

      const response = await POST({ request } as any)

      expect(response.options?.status).toBe(403)
      expect(response.data.error).toContain("Not a participant")
    })
  })

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockDb.insert = vi.fn(() => {
        throw new Error("Database error")
      })

      const request = {
        json: async () => ({
          eventId: "evt_123",
          name: "Pizza",
          category: "plat",
          deviceId: "device_123",
        }),
      }

      const response = await POST({ request } as any)

      expect(response.options?.status).toBe(500)
      expect(response.data.error).toContain("Failed to add item")
    })
  })
})
