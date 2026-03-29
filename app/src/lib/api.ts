// API client with device ID injection and error handling

import { getDeviceId } from '$lib/utils/device-id';
import { log } from '$lib/utils/logger';

const API_BASE = ''; // Use relative paths for SvelteKit API routes

export interface ApiOptions extends RequestInit {
  includeDeviceId?: boolean;
}

/**
 * Enhanced fetch wrapper with device ID injection and error handling
 */
export async function api<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { includeDeviceId = true, ...fetchOptions } = options;

  // Inject device ID in headers if requested
  const headers = new Headers(fetchOptions.headers);
  if (includeDeviceId && typeof window !== 'undefined') {
    headers.set('X-Device-ID', getDeviceId());
  }

  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('error', 'API request failed', {
        url,
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    // Handle empty responses (e.g., DELETE)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    return await response.json();
  } catch (err) {
    log('error', 'API request exception', {
      url,
      error: String(err)
    });
    throw err;
  }
}

/**
 * GET request
 */
export function apiGet<T>(endpoint: string, options?: ApiOptions): Promise<T> {
  return api<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export function apiPost<T>(
  endpoint: string,
  data?: unknown,
  options?: ApiOptions
): Promise<T> {
  return api<T>(endpoint, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: data ? JSON.stringify(data) : undefined
  });
}

/**
 * PATCH request
 */
export function apiPatch<T>(
  endpoint: string,
  data: unknown,
  options?: ApiOptions
): Promise<T> {
  return api<T>(endpoint, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request
 */
export function apiDelete(endpoint: string, options?: ApiOptions): Promise<void> {
  return api(endpoint, { ...options, method: 'DELETE' });
}
