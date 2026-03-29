import { browser } from '$app/environment';

/**
 * Device ID Authentication Utilities
 * 
 * Provides anonymous authentication via device ID stored in localStorage
 * No accounts required - zero-friction UX
 */

const DEVICE_ID_KEY = 'popote_device_id';

/**
 * Get or generate device ID
 * 
 * Returns device ID from localStorage, or generates a new one if none exists
 * Also syncs to cookie for SSR compatibility
 * 
 * @returns Device ID (UUID v4)
 */
export function getDeviceId(): string {
	if (!browser) return '';

	let deviceId = localStorage.getItem(DEVICE_ID_KEY);

	if (!deviceId) {
		// Generate UUID v4
		deviceId = crypto.randomUUID();
		localStorage.setItem(DEVICE_ID_KEY, deviceId);
	}

	// Sync to cookie for SSR
	document.cookie = `${DEVICE_ID_KEY}=${deviceId}; path=/; max-age=31536000; SameSite=Lax`;

	return deviceId;
}

/**
 * Clear device ID (for testing or logout)
 */
export function clearDeviceId(): void {
	if (!browser) return;

	localStorage.removeItem(DEVICE_ID_KEY);
	document.cookie = `${DEVICE_ID_KEY}=; path=/; max-age=0`;
}
