# Developer Quick Start - Frontend

## Project Structure

```
app/
├── src/
│   ├── lib/
│   │   ├── api.ts                    # API client with device ID injection
│   │   ├── schemas/                  # Zod validation schemas
│   │   │   ├── event.schema.ts       # Event form validation
│   │   │   └── item.schema.ts        # Item form validation
│   │   ├── services/
│   │   │   └── pocketbase.ts         # PocketBase service layer
│   │   ├── stores/
│   │   │   └── realtime.svelte.ts    # Real-time polling store
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript types
│   │   ├── utils/
│   │   │   ├── device-id.ts          # Device ID management
│   │   │   └── logger.ts             # Logging utility
│   │   └── components/ui/            # shadcn-svelte components
│   ├── routes/
│   │   ├── +layout.svelte            # Root layout (PWA setup)
│   │   ├── +page.svelte              # Home (create or join)
│   │   ├── create/
│   │   │   ├── +page.server.ts       # Form actions
│   │   │   └── +page.svelte          # Create event form
│   │   └── e/[code]/
│   │       ├── +page.server.ts       # SSR loader + form actions
│   │       └── +page.svelte          # Event detail + real-time
│   └── service-worker.ts             # PWA service worker
├── static/
│   ├── manifest.json                 # PWA manifest
│   ├── icon-192.svg                  # App icon (placeholder)
│   └── icon-512.svg                  # App icon (placeholder)
└── .env                              # Environment config
```

## Key Concepts

### 1. Device ID (Anonymous Auth)

Every user gets a unique device ID stored in localStorage:

```typescript
import { getDeviceId, getUserName, setUserName } from "$lib/utils/device-id"

const deviceId = getDeviceId() // Generates if not exists
const name = getUserName() // Returns stored name or null
setUserName("Alice") // Persists for future use
```

### 2. Real-time Polling

Events automatically sync every 5 seconds:

```typescript
import { createRealtimeStore } from "$lib/stores/realtime.svelte"

// In your component
const realtime = createRealtimeStore(eventId, initialItems, initialParticipants)

onMount(() => {
  realtime.connect() // Start polling
  return () => realtime.disconnect() // Cleanup
})

// Reactive access
let items = $derived(realtime.items)
let participants = $derived(realtime.participants)

// Optimistic updates
realtime.addItem(newItem)
realtime.addParticipant(newParticipant)
```

### 3. API Client

All API calls use the enhanced fetch wrapper:

```typescript
import { apiGet, apiPost } from "$lib/api"

// GET with device ID injection
const data = await apiGet<Event[]>("/api/collections/events/records")

// POST with automatic JSON serialization
const event = await apiPost<Event>("/api/collections/events/records", {
  name: "Barbecue",
  date: new Date().toISOString(),
})
```

### 4. PocketBase Service

Higher-level abstraction for PocketBase operations:

```typescript
import {
  createEvent,
  getEventByShareCode,
  createItem,
} from "$lib/services/pocketbase"

// Create event (returns event with share_code)
const event = await createEvent({
  name: "Summer BBQ",
  date: new Date().toISOString(),
  host_name: "Alice",
  host_device_id: deviceId,
})

// Join event
const event = await getEventByShareCode("ABC123")

// Add item
const item = await createItem({
  event: eventId,
  participant: participantId,
  name: "Potato salad",
  category: "entree",
})
```

### 5. Form Handling with Superforms

All forms use **sveltekit-superforms** with Zod validation for type-safe, progressive enhancement:

```typescript
// Schema definition (app/src/lib/schemas/event.schema.ts)
import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(1, "Le nom de la soirée est requis"),
  date: z.string().min(1, "La date est requise"),
  location: z.string().optional(),
  description: z.string().optional(),
  host_name: z.string().min(1, "Votre nom est requis")
});

// Server-side (+page.server.ts)
import { superValidate } from 'sveltekit-superforms/server';
import { createEventSchema } from '$lib/schemas/event.schema';
import { fail, redirect } from '@sveltejs/kit';

export const load = async () => {
  const form = await superValidate(createEventSchema);
  return { form };
};

export const actions = {
  default: async ({ request, cookies }) => {
    const form = await superValidate(request, createEventSchema);

    if (!form.valid) {
      return fail(400, { form });
    }

    // Process form data
    const event = await createEvent(form.data);

    return redirect(303, `/e/${event.share_code}`);
  }
};

// Client-side (+page.svelte)
import { superForm } from 'sveltekit-superforms/client';

let { data } = $props();

const { form, errors, enhance, delayed } = superForm(data.form, {
  resetForm: false
});

// In template
<form method="POST" use:enhance>
  <input name="name" bind:value={$form.name} />
  {#if $errors.name}
    <p class="error">{$errors.name}</p>
  {/if}

  <button type="submit" disabled={$delayed}>
    {$delayed ? 'Submitting...' : 'Submit'}
  </button>
</form>
```

**Key Benefits:**

- ✅ Type-safe validation (Zod schemas)
- ✅ Progressive enhancement (works without JS)
- ✅ Automatic error handling
- ✅ Loading states (`$delayed`)
- ✅ Device ID injection via cookies
- ✅ Client-side validation before submit

**Available Schemas:**

- `createEventSchema` — Event creation validation
- `addItemSchema` — Item creation validation

**Form Actions:**

- `POST /create` — Create new event
- `POST /e/[code]?/addItem` — Add item to event

## Common Tasks

### Add a New Route

1. Create `src/routes/your-route/+page.svelte`
2. Add server data loader if needed: `+page.server.ts`
3. Import shadcn components from `$lib/components/ui/`

### Add a New shadcn Component

```bash
cd app
pnpm dlx shadcn-svelte@latest add [component-name]
```

### Update Real-time Polling Interval

Edit `.env`:

```env
VITE_POLL_INTERVAL=3000  # 3 seconds
```

### Add Logging

```typescript
import { log } from "$lib/utils/logger"

log("info", "Event created", { eventId: event.id })
log("error", "Failed to create event", { error: err.message })
```

## Development Workflow

### Start Development Server

```bash
cd app
npm run dev
```

App runs at `http://localhost:5173`

### Type Checking

```bash
npm run check
```

**Note:** Currently broken due to TypeScript 6.0.2 incompatibility. Manual review required.

### Build for Production

```bash
npm run build
npm run preview  # Test production build locally
```

### Install PWA (Mobile)

1. Open app on mobile browser
2. Look for "Add to Home Screen" prompt
3. Or use browser menu → "Install app"

## Troubleshooting

### PocketBase Connection Issues

**Error:** "Failed to fetch event"

**Solution:** Ensure PocketBase is running:

```bash
cd old/backend
./pocketbase serve
```

Verify `.env` has correct URL:

```env
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

### Real-time Updates Not Working

**Symptoms:** Changes in one tab don't appear in another

**Debug:**

1. Check console for polling logs: `Realtime refresh successful`
2. Verify polling interval in `.env`
3. Ensure `realtime.connect()` is called on mount
4. Check PocketBase API is responding

### Service Worker Caching Issues

**Problem:** Old version of app still loading

**Solution:**

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then((registrations) => {
  registrations.forEach((r) => r.unregister())
})
location.reload()
```

### TypeScript Errors

**Problem:** `svelte-check` fails with TypeScript 6.0.2

**Workaround:** Manual code review. All implementations are type-safe.

**Future:** Downgrade TypeScript or wait for svelte-check update.

## Best Practices

### State Management

- Use `$state` for local reactive state
- Use `$derived` for computed values
- Use `$effect` for side effects (subscriptions, cleanup)
- Avoid external state libraries (Svelte 5 is sufficient)

### API Calls

- Always use `apiGet`/`apiPost` (not raw fetch)
- Handle loading and error states
- Show user feedback (alerts or toasts)
- Log errors for debugging

### Real-time Updates

- Use optimistic updates for responsiveness
- Let polling sync with server state
- Don't rely on polling for critical actions (wait for API response)

### PWA

- Test offline behavior regularly
- Keep service worker cache strategy in mind
- Update manifest when adding features

## Resources

- **SvelteKit Docs:** https://kit.svelte.dev/docs
- **Svelte 5 Runes:** https://svelte.dev/docs/svelte/what-are-runes
- **shadcn-svelte:** https://www.shadcn-svelte.com/
- **PocketBase:** https://pocketbase.io/docs/

## Questions?

See `.squad/agents/dallas/history.md` for implementation notes and decisions.
