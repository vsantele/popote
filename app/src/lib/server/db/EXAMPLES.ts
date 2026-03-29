// Example SvelteKit routes for Popote backend
// Place these in your src/routes/ directory structure

// ========================================
// 1. CREATE EVENT
// ========================================
// File: src/routes/events/create/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { events, participants } from '$lib/db/schema';
import { generateUniqueShareCode } from '$lib/db/utils';
import type { Actions } from './$types';

export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString();
    const date = data.get('date')?.toString();
    const location = data.get('location')?.toString();
    const description = data.get('description')?.toString();
    const hostName = data.get('host_name')?.toString();
    const deviceId = locals.deviceId; // From SvelteKit hooks

    // Validation
    if (!name || !date || !hostName || !deviceId) {
      return fail(400, {
        error: 'Missing required fields',
        missing: { name: !name, date: !date, hostName: !hostName }
      });
    }

    try {
      const db = getDb();
      const shareCode = await generateUniqueShareCode();

      // Create event
      const [event] = await db.insert(events).values({
        name,
        date: new Date(date),
        location: location || null,
        description: description || null,
        hostName,
        hostDeviceId: deviceId,
        shareCode,
      }).returning();

      // Auto-create host participant (ported from PocketBase hooks)
      await db.insert(participants).values({
        eventId: event.id,
        name: hostName,
        deviceId,
        isHost: true,
      });

      // Redirect to event page
      return redirect(303, `/s/${shareCode}`);
    } catch (error) {
      console.error('Event creation failed:', error);
      return fail(500, { error: 'Failed to create event' });
    }
  }
} satisfies Actions;


// ========================================
// 2. VIEW EVENT (by share code)
// ========================================
// File: src/routes/s/[shareCode]/+page.server.ts

import { error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { events } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load = (async ({ params }) => {
  const db = getDb();

  // Query with relations (Drizzle relational queries)
  const event = await db.query.events.findFirst({
    where: eq(events.shareCode, params.shareCode),
    with: {
      participants: {
        orderBy: (participants, { desc }) => [desc(participants.isHost)],
      },
      items: {
        with: {
          participant: true,
        },
        orderBy: (items, { asc }) => [asc(items.category), asc(items.createdAt)],
      },
    },
  });

  if (!event) {
    throw error(404, 'Event not found');
  }

  // Group items by category
  const itemsByCategory = event.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof event.items>);

  return {
    event,
    itemsByCategory,
  };
}) satisfies PageServerLoad;


// ========================================
// 3. ADD ITEM
// ========================================
// File: src/routes/s/[shareCode]/items/+page.server.ts

import { fail } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { events, participants, items, VALID_CATEGORIES } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Actions } from './$types';

export const actions = {
  add: async ({ params, request, locals }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString();
    const category = data.get('category')?.toString();
    const quantity = data.get('quantity')?.toString();
    const deviceId = locals.deviceId;

    // Validation
    if (!name || !category || !deviceId) {
      return fail(400, { error: 'Missing required fields' });
    }

    if (!VALID_CATEGORIES.includes(category as any)) {
      return fail(400, { error: 'Invalid category' });
    }

    try {
      const db = getDb();

      // Get event by share code
      const event = await db.query.events.findFirst({
        where: eq(events.shareCode, params.shareCode),
      });

      if (!event) {
        return fail(404, { error: 'Event not found' });
      }

      // Get or create participant
      let participant = await db.query.participants.findFirst({
        where: and(
          eq(participants.eventId, event.id),
          eq(participants.deviceId, deviceId)
        ),
      });

      // If participant doesn't exist, they must join first
      if (!participant) {
        return fail(403, {
          error: 'You must join the event before adding items',
          redirectTo: `/s/${params.shareCode}/join`
        });
      }

      // Create item
      await db.insert(items).values({
        eventId: event.id,
        participantId: participant.id,
        name,
        category,
        quantity: quantity || null,
      });

      return { success: true };
    } catch (error) {
      console.error('Add item failed:', error);
      return fail(500, { error: 'Failed to add item' });
    }
  },

  delete: async ({ request, locals }) => {
    const data = await request.formData();
    const itemId = parseInt(data.get('item_id')?.toString() || '');
    const deviceId = locals.deviceId;

    if (!itemId || !deviceId) {
      return fail(400, { error: 'Invalid request' });
    }

    try {
      const db = getDb();

      // Verify ownership (item creator's device_id must match)
      const item = await db.query.items.findFirst({
        where: eq(items.id, itemId),
        with: {
          participant: true,
        },
      });

      if (!item) {
        return fail(404, { error: 'Item not found' });
      }

      if (item.participant.deviceId !== deviceId) {
        return fail(403, { error: 'You can only delete your own items' });
      }

      // Delete item
      await db.delete(items).where(eq(items.id, itemId));

      return { success: true };
    } catch (error) {
      console.error('Delete item failed:', error);
      return fail(500, { error: 'Failed to delete item' });
    }
  }
} satisfies Actions;


// ========================================
// 4. JOIN EVENT (create participant)
// ========================================
// File: src/routes/s/[shareCode]/join/+page.server.ts

import { fail, redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { events, participants } from '$lib/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Actions } from './$types';

export const actions = {
  default: async ({ params, request, locals }) => {
    const data = await request.formData();
    const name = data.get('name')?.toString();
    const deviceId = locals.deviceId;

    if (!name || !deviceId) {
      return fail(400, { error: 'Name is required' });
    }

    try {
      const db = getDb();

      // Get event by share code
      const event = await db.query.events.findFirst({
        where: eq(events.shareCode, params.shareCode),
      });

      if (!event) {
        return fail(404, { error: 'Event not found' });
      }

      // Check if participant already exists
      const existing = await db.query.participants.findFirst({
        where: and(
          eq(participants.eventId, event.id),
          eq(participants.deviceId, deviceId)
        ),
      });

      if (existing) {
        // Already joined, redirect to event
        return redirect(303, `/s/${params.shareCode}`);
      }

      // Create participant
      await db.insert(participants).values({
        eventId: event.id,
        name,
        deviceId,
        isHost: false,
      });

      return redirect(303, `/s/${params.shareCode}`);
    } catch (error) {
      if (error instanceof Response) throw error; // Re-throw redirects
      console.error('Join event failed:', error);
      return fail(500, { error: 'Failed to join event' });
    }
  }
} satisfies Actions;


// ========================================
// 5. DEVICE ID HOOK (SvelteKit)
// ========================================
// File: src/hooks.server.ts

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Get device ID from cookie (set by client)
  const deviceId = event.cookies.get('popote_device_id');

  if (deviceId) {
    event.locals.deviceId = deviceId;
  }

  return resolve(event);
};

// File: src/app.d.ts (TypeScript definitions)
declare global {
  namespace App {
    interface Locals {
      deviceId?: string;
    }
  }
}

export {};


// ========================================
// 6. CLIENT-SIDE DEVICE ID GENERATION
// ========================================
// File: src/lib/auth.ts

import { browser } from '$app/environment';

export function getDeviceId(): string {
  if (!browser) return '';

  let deviceId = localStorage.getItem('popote_device_id');

  if (!deviceId) {
    // Generate UUID v4
    deviceId = crypto.randomUUID();
    localStorage.setItem('popote_device_id', deviceId);
  }

  // Sync to cookie for SSR
  document.cookie = `popote_device_id=${deviceId}; path=/; max-age=31536000`; // 1 year

  return deviceId;
}

// Call on app initialization
export function initAuth() {
  if (browser) {
    getDeviceId(); // Ensures device ID exists and is synced to cookie
  }
}


// ========================================
// 7. REAL-TIME POLLING (CLIENT)
// ========================================
// File: src/routes/s/[shareCode]/+page.svelte

/*
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { invalidate } from '$app/navigation';
  import type { PageData } from './$types';

  export let data: PageData;

  let pollingInterval: ReturnType<typeof setInterval>;

  onMount(() => {
    // Poll every 2 seconds for updates
    pollingInterval = setInterval(() => {
      invalidate('event:data'); // Triggers load function re-run
    }, 2000);
  });

  onDestroy(() => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
  });
</script>

<h1>{data.event.name}</h1>
<p>Date: {new Date(data.event.date).toLocaleDateString()}</p>

<!-- Display participants -->
<h2>Participants</h2>
<ul>
  {#each data.event.participants as participant}
    <li>
      {participant.name}
      {#if participant.isHost}
        <span class="badge">Host</span>
      {/if}
    </li>
  {/each}
</ul>

<!-- Display items by category -->
<h2>Items</h2>
{#each Object.entries(data.itemsByCategory) as [category, categoryItems]}
  <section>
    <h3>{category}</h3>
    <ul>
      {#each categoryItems as item}
        <li>
          {item.name}
          {#if item.quantity}
            ({item.quantity})
          {/if}
          <span class="participant">— {item.participant.name}</span>
        </li>
      {/each}
    </ul>
  </section>
{/each}
*/
