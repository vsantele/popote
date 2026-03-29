// Device ID and user name persistence in browser

const DEVICE_ID_KEY = 'popote_device_id';
const USER_NAME_KEY = 'popote_user_name';

/**
 * Get or generate device ID for anonymous user identification
 * Stored in localStorage for persistence across sessions
 */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return ''; // SSR safety
  
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

/**
 * Get stored user name (if user has provided it)
 */
export function getUserName(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_NAME_KEY);
}

/**
 * Store user name for future sessions
 */
export function setUserName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_NAME_KEY, name);
}

/**
 * Clear user name (logout)
 */
export function clearUserName(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_NAME_KEY);
}
