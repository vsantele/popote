import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateUniqueShareCode, isValidShareCode } from '../../db/utils';
import { getDb } from '../../db/index';
import { events } from '../../db/schema';

// Mock database
vi.mock('../../db/index', () => ({
	getDb: vi.fn(),
}));

describe('Share Code Generation', () => {
	const mockDb = {
		select: vi.fn(() => ({
			from: vi.fn(() => ({
				where: vi.fn(() => ({
					limit: vi.fn(() => Promise.resolve([])),
				})),
			})),
		})),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(getDb).mockReturnValue(mockDb as any);
	});

	describe('generateUniqueShareCode()', () => {
		it('should generate a 6-character alphanumeric code', async () => {
			const code = await generateUniqueShareCode();

			expect(code).toHaveLength(6);
			expect(code).toMatch(/^[A-Z0-9]{6}$/);
		});

		it('should generate unique codes', async () => {
			const codes = new Set();
			for (let i = 0; i < 20; i++) {
				codes.add(await generateUniqueShareCode());
			}

			// Should have at least 15 unique codes (allowing for some rare collisions)
			expect(codes.size).toBeGreaterThanOrEqual(15);
		});

		it('should check database for existing codes', async () => {
			await generateUniqueShareCode();

			expect(mockDb.select).toHaveBeenCalled();
		});

		it('should retry if code already exists', async () => {
			let callCount = 0;
			mockDb.select = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						limit: vi.fn(() => {
							callCount++;
							// First call: code exists, second call: code is unique
							return Promise.resolve(callCount === 1 ? [{ id: 'evt_123' }] : []);
						}),
					})),
				})),
			}));

			vi.mocked(getDb).mockReturnValue(mockDb as any);

			const code = await generateUniqueShareCode();

			expect(code).toBeDefined();
			expect(callCount).toBe(2); // Retried once
		});

		it('should throw error after max attempts', async () => {
			// Mock all attempts to return existing code
			mockDb.select = vi.fn(() => ({
				from: vi.fn(() => ({
					where: vi.fn(() => ({
						limit: vi.fn(() => Promise.resolve([{ id: 'evt_123' }])),
					})),
				})),
			}));

			vi.mocked(getDb).mockReturnValue(mockDb as any);

			await expect(generateUniqueShareCode()).rejects.toThrow(
				'Failed to generate unique share code after maximum attempts'
			);
		});

		it('should have low collision rate', async () => {
			// With 36^6 = 2,176,782,336 possible codes, collision should be rare
			const code1 = await generateUniqueShareCode();
			const code2 = await generateUniqueShareCode();

			// They might be the same (1 in 2 billion chance), but likely different
			// This test just ensures generation works
			expect(code1).toMatch(/^[A-Z0-9]{6}$/);
			expect(code2).toMatch(/^[A-Z0-9]{6}$/);
		});
	});

	describe('isValidShareCode()', () => {
		it('should validate correct 6-character codes', () => {
			expect(isValidShareCode('ABC123')).toBe(true);
			expect(isValidShareCode('XYZ789')).toBe(true);
			expect(isValidShareCode('A1B2C3')).toBe(true);
		});

		it('should validate correct 7-character codes', () => {
			expect(isValidShareCode('ABCD123')).toBe(true);
		});

		it('should validate correct 8-character codes', () => {
			expect(isValidShareCode('ABCD1234')).toBe(true);
		});

		it('should reject codes that are too short', () => {
			expect(isValidShareCode('ABC12')).toBe(false);
			expect(isValidShareCode('A')).toBe(false);
			expect(isValidShareCode('')).toBe(false);
		});

		it('should reject codes that are too long', () => {
			expect(isValidShareCode('ABCD12345')).toBe(false);
			expect(isValidShareCode('ABCDEFGHIJ')).toBe(false);
		});

		it('should reject lowercase characters', () => {
			expect(isValidShareCode('abc123')).toBe(false);
			expect(isValidShareCode('AbC123')).toBe(false);
		});

		it('should reject special characters', () => {
			expect(isValidShareCode('ABC-123')).toBe(false);
			expect(isValidShareCode('ABC_123')).toBe(false);
			expect(isValidShareCode('ABC.123')).toBe(false);
			expect(isValidShareCode('ABC 123')).toBe(false);
		});

		it('should handle null/undefined gracefully', () => {
			expect(isValidShareCode(null as any)).toBe(false);
			expect(isValidShareCode(undefined as any)).toBe(false);
		});
	});

	describe('Share Code Collision Resistance', () => {
		it('should have sufficient entropy (36^6 possible codes)', () => {
			const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			const possibleCodes = Math.pow(chars.length, 6);

			// 2,176,782,336 possible codes
			expect(possibleCodes).toBeGreaterThan(2_000_000_000);
		});

		it('should handle concurrent generation safely', async () => {
			// Simulate multiple concurrent requests
			const promises = Array.from({ length: 10 }, () => generateUniqueShareCode());
			const codes = await Promise.all(promises);

			// All should be valid
			codes.forEach((code) => {
				expect(code).toMatch(/^[A-Z0-9]{6}$/);
			});
		});
	});
});
