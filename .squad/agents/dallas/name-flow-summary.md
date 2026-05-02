# Name Collection Flow — Before & After

## ❌ Before (Problematic UX)

### Host Flow

1. Home → Click "Créer une soirée"
2. `/create` → Fill form (name, event details) ✅
3. Creates event → Redirects to `/e/ABC123`
4. Can add items ✅

### Guest Flow

1. Home → Enter share code "ABC123" → Click "Rejoindre"
2. `/e/ABC123` → Directly sees event details ⚠️ (no name collected)
3. Click "Ajouter un item" → Dialog opens
4. **Must enter name EVERY time** ❌ (annoying!)
5. Submits item with name

**Problem**: Name asked repeatedly when adding items, not when joining.

---

## ✅ After (Streamlined UX)

### Host Flow (Unchanged)

1. Home → Click "Créer une soirée"
2. `/create` → Fill form (name, event details) ✅
3. Creates event → Redirects to `/e/ABC123`
4. Can add items freely ✅

### Guest Flow (Improved)

1. Home → Enter share code "ABC123" → Click "Rejoindre"
2. `/join/ABC123` → **Name form appears** ✅ (name collected ONCE)
3. Submits name → Creates participant → Redirects to `/e/ABC123`
4. Click "Ajouter un item" → Dialog opens
5. **No name field!** ✅ (just item details)
6. Submits item → Uses stored name automatically

**Benefit**: Name collected once at natural entry point, then reused for all items.

---

## Technical Implementation

### New Route: `/join/[code]`

**Purpose**: Collect guest name before viewing event

**Files**:

- `app/src/routes/join/[code]/+page.svelte` — Form UI
- `app/src/routes/join/[code]/+page.server.ts` — Server logic

**Logic**:

1. Load function checks if userName cookie exists
   - If yes → Redirect to `/e/[code]` (skip name entry)
   - If no → Show name form
2. Form action:
   - Validates name
   - Creates participant record in database
   - Stores userName in cookie
   - Redirects to `/e/[code]`

### Updated Routes

**Home (`/+page.svelte`)**:

- Join button: `goto('/join/${code}')` instead of `goto('/e/${code}')`

**Event Detail (`/e/[code]/+page.server.ts`)**:

- Load function: Added guard
  ```typescript
  if (!userName && deviceId !== event.hostDeviceId) {
    return redirect(303, `/join/${shareCode}`);
  }
  ```
- addItem action: Changed to use userName from cookie
  ```typescript
  const userName = cookies.get("userName");
  if (!userName) {
    return fail(401, { form, error: "Session invalide" });
  }
  ```

**Event Detail (`/e/[code]/+page.svelte`)**:

- Removed `participant_name` field from add item dialog
- Form now only has: name, category, quantity

**Item Schema (`item.schema.ts`)**:

```typescript
// Before
export const addItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum([...]),
  quantity: z.string().optional(),
  participant_name: z.string().min(1) // ❌ Removed
});

// After
export const addItemSchema = z.object({
  name: z.string().min(1),
  category: z.enum([...]),
  quantity: z.string().optional()
  // participant_name removed ✅
});
```

---

## User Flow Comparison

| Step            | Before                       | After                        |
| --------------- | ---------------------------- | ---------------------------- |
| Guest joins     | Goes straight to `/e/[code]` | Goes to `/join/[code]` first |
| Name collection | ❌ When adding first item    | ✅ When joining event        |
| Adding item #1  | Must enter name              | Just item details            |
| Adding item #2  | Must enter name again        | Just item details            |
| Adding item #3  | Must enter name again        | Just item details            |

**Result**: Much faster and less repetitive! 🎉

---

## Testing Checklist

- [x] Dev server starts successfully
- [x] TypeScript compiles without errors
- [x] Routes follow SvelteKit conventions
- [ ] Manual test: Create event as host
- [ ] Manual test: Join event as guest
- [ ] Manual test: Add item without name field
- [ ] Manual test: Cookie persistence across sessions
- [ ] Manual test: Direct link to `/e/[code]` redirects to join

---

## Files Changed

**Created**:

- `app/src/routes/join/[code]/+page.svelte`
- `app/src/routes/join/[code]/+page.server.ts`

**Modified**:

- `app/src/routes/+page.svelte` (join redirect)
- `app/src/routes/e/[code]/+page.svelte` (removed name field)
- `app/src/routes/e/[code]/+page.server.ts` (added guard, updated action)
- `app/src/lib/schemas/item.schema.ts` (removed participant_name)
