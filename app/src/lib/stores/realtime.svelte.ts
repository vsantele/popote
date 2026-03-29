// Real-time polling store for event updates

import { log } from '$lib/utils/logger';
import type { Item, Participant } from '$lib/types';

const POLL_INTERVAL = parseInt(import.meta.env.VITE_POLL_INTERVAL || '5000', 10);

/**
 * Creates a real-time polling store for an event
 * Automatically refreshes items and participants every POLL_INTERVAL ms
 */
export function createRealtimeStore(shareCode: string, initialItems: Item[], initialParticipants: Participant[]) {
  let items = $state<Item[]>(initialItems);
  let participants = $state<Participant[]>(initialParticipants);
  let isPolling = $state(false);
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let lastError: string | null = null;

  /**
   * Fetch latest data from server using API routes
   */
  async function refresh() {
    if (isPolling) return; // Prevent concurrent polls

    isPolling = true;
    lastError = null;

    try {
      // Fetch from API route
      const response = await fetch(`/api/events/${shareCode}`);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      // Transform data to match frontend types
      const transformedItems = data.items.map((i: any) => ({
        id: String(i.id),
        event: String(i.eventId),
        participant: String(i.participantId),
        name: i.name,
        category: i.category,
        quantity: i.quantity || undefined,
        created: i.createdAt,
      }));

      const transformedParticipants = data.participants.map((p: any) => ({
        id: String(p.id),
        event: String(p.eventId),
        name: p.name,
        device_id: p.deviceId,
        is_host: p.isHost,
        created: p.createdAt,
      }));

      // Update state
      items = transformedItems;
      participants = transformedParticipants;

      log('debug', 'Realtime refresh successful', {
        shareCode,
        itemCount: items.length,
        participantCount: participants.length
      });
    } catch (err) {
      lastError = String(err);
      log('warn', 'Realtime refresh failed', {
        shareCode,
        error: lastError
      });
    } finally {
      isPolling = false;
    }
  }

  /**
   * Start polling
   */
  function connect() {
    if (intervalId) return; // Already connected

    // Initial refresh
    refresh();

    // Set up polling interval
    intervalId = setInterval(refresh, POLL_INTERVAL);

    log('info', 'Realtime polling started', {
      shareCode,
      intervalMs: POLL_INTERVAL
    });
  }

  /**
   * Stop polling
   */
  function disconnect() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;

      log('info', 'Realtime polling stopped', { shareCode });
    }
  }

  /**
   * Manually add an item (optimistic update)
   */
  function addItem(item: Item) {
    items = [...items, item];
  }

  /**
   * Manually add a participant (optimistic update)
   */
  function addParticipant(participant: Participant) {
    participants = [...participants, participant];
  }

  return {
    // State (reactive via $state)
    get items() { return items; },
    get participants() { return participants; },
    get isPolling() { return isPolling; },
    get lastError() { return lastError; },

    // Methods
    connect,
    disconnect,
    refresh,
    addItem,
    addParticipant
  };
}
