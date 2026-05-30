<script lang="ts">
  import { Button } from "$lib/components/ui/button"
  import { Badge } from "$lib/components/ui/badge"
  import { ToggleGroup, ToggleGroupItem } from "$lib/components/ui/toggle-group"
  import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
  } from "$lib/components/ui/dialog"
  import { Input } from "$lib/components/ui/input"
  import { Label } from "$lib/components/ui/label"
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
  } from "$lib/components/ui/select"
  import {
    CATEGORIES,
    CATEGORY_ORDER,
    DIETARY_TAGS,
    VALID_DIETARY_TAGS,
    type Item,
    type ItemCategory,
    type DietaryTag,
    type EventSlot,
  } from "$lib/types/index"
  import { computeHeadcount } from "$lib/utils/headcount"
  import { log } from "$lib/utils/logger"
  import { superForm } from "sveltekit-superforms/client"
  import { untrack } from "svelte"
  import { invalidateAll, goto } from "$app/navigation"
  import { page } from "$app/state"
  import { connectFetchEventStream } from "$lib/realtime/fetch-sse"
  import { LiveStore } from "$lib/realtime/live-store.svelte"
  import {
    RefreshCw,
    Plus,
    Calendar,
    MapPin,
    Copy,
    Check,
    Users,
    Pencil,
    Trash2,
    Gift,
    HandHeart,
  } from "@lucide/svelte"
  import * as m from "$lib/paraglide/messages"
  import { getLocale, localizeHref } from "$lib/paraglide/runtime"
  import PushOptIn from "$lib/components/push-opt-in.svelte"
  import QrDialog from "$lib/components/qr-dialog.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  // Derive viewMode from URL (single source of truth)
  let viewMode = $derived<"category" | "person">(
    page.url.searchParams.get("view") === "person" ? "person" : "category",
  )

  function setViewMode(newMode: "category" | "person") {
    const url = new URL(page.url)
    if (newMode === "category") {
      url.searchParams.delete("view")
    } else {
      url.searchParams.set("view", newMode)
    }
    goto(url, { replaceState: true, noScroll: true, keepFocus: true })
  }

  let dialogOpen = $state(false)
  let isRefreshing = $state(false)
  let copied = $state(false)

  // Use data directly from server load
  let items = $derived(data.items)
  let participants = $derived(data.participants)

  // Setup Superform for adding items
  // svelte-ignore state_referenced_locally
  const { form, errors, enhance, delayed, message } = superForm(data.form, {
    id: "addItem",
    resetForm: true,
    onUpdated: async ({ form }) => {
      if (form.valid) {
        dialogOpen = false
        await invalidateAll()
      }
    },
  })

  if (!$form.category) {
    $form.category = "plat"
  }

  // ── Edit item flow ─────────────────────────────────────────────────
  let editDialogOpen = $state(false)
  // svelte-ignore state_referenced_locally
  const {
    form: editFormData,
    errors: editErrors,
    enhance: editEnhance,
    delayed: editDelayed,
    message: editMessage,
  } = superForm(data.editForm, {
    id: "editItem",
    onUpdated: async ({ form }) => {
      if (form.valid) {
        editDialogOpen = false
        await invalidateAll()
      }
    },
  })

  function openEditDialog(item: Item) {
    $editFormData.id = item.id
    $editFormData.name = item.name
    $editFormData.category = item.category
    $editFormData.quantity = item.quantity ?? ""
    $editFormData.dietaryTags = item.dietary_tags ?? []
    editDialogOpen = true
  }

  // ── Categories where dietary tags are irrelevant (non-food) ────────
  const NON_FOOD_CATEGORIES: ItemCategory[] = ["jeux", "autre"]

  // Derived booleans: should the dietary-tag picker be shown?
  const showAddDietaryTags = $derived(
    !NON_FOOD_CATEGORIES.includes($form.category as ItemCategory),
  )
  const showEditDietaryTags = $derived(
    !NON_FOOD_CATEGORIES.includes($editFormData.category as ItemCategory),
  )

  // Clear dietary tags when category switches to a non-food one (add dialog).
  $effect(() => {
    const cat = $form.category as ItemCategory
    if (NON_FOOD_CATEGORIES.includes(cat)) {
      untrack(() => {
        if ($form.dietaryTags && $form.dietaryTags.length > 0) {
          $form.dietaryTags = []
        }
      })
    }
  })

  // Clear dietary tags when category switches to a non-food one (edit dialog).
  $effect(() => {
    const cat = $editFormData.category as ItemCategory
    if (NON_FOOD_CATEGORIES.includes(cat)) {
      untrack(() => {
        if ($editFormData.dietaryTags && $editFormData.dietaryTags.length > 0) {
          $editFormData.dietaryTags = []
        }
      })
    }
  })

  // ── Delete item flow ───────────────────────────────────────────────
  let deleteDialogOpen = $state(false)
  let pendingDelete = $state<Item | null>(null)
  // svelte-ignore state_referenced_locally
  const {
    form: deleteFormData,
    enhance: deleteEnhance,
    delayed: deleteDelayed,
    message: deleteMessage,
  } = superForm(data.deleteForm, {
    id: "deleteItem",
    onUpdated: async ({ form }) => {
      if (form.valid) {
        deleteDialogOpen = false
        pendingDelete = null
        await invalidateAll()
      }
    },
  })

  function openDeleteDialog(item: Item) {
    pendingDelete = item
    $deleteFormData.id = item.id
    deleteDialogOpen = true
  }

  // ── RSVP flow ──────────────────────────────────────────────────────
  let rsvpDialogOpen = $state(false)
  // svelte-ignore state_referenced_locally
  const {
    form: rsvpFormData,
    enhance: rsvpEnhance,
    delayed: rsvpDelayed,
    message: rsvpMessage,
  } = superForm(data.rsvpForm, {
    id: "setRsvp",
    onUpdated: async ({ form }) => {
      if (form.valid) {
        rsvpDialogOpen = false
        await invalidateAll()
      }
    },
  })

  function openRsvpDialog() {
    if (data.currentParticipant) {
      // Hosts are always "going"; no need to set going/maybe/not for them.
      $rsvpFormData.rsvp = data.isHost ? "going" : data.currentParticipant.rsvp
      $rsvpFormData.extraGuests = data.currentParticipant.extra_guests
    }
    rsvpDialogOpen = true
  }

  // ── Host wishlist / needed slots (issue #5) ────────────────────────
  let slots = $derived(data.slots ?? [])

  // Create-slot flow (host only).
  let createSlotDialogOpen = $state(false)
  // svelte-ignore state_referenced_locally
  const {
    form: createSlotForm,
    errors: createSlotErrors,
    enhance: createSlotEnhance,
    delayed: createSlotDelayed,
    message: createSlotMessage,
  } = superForm(data.createSlotForm, {
    id: "createSlot",
    resetForm: true,
    onUpdated: async ({ form }) => {
      if (form.valid) {
        createSlotDialogOpen = false
        await invalidateAll()
      }
    },
  })

  // Edit-slot flow (host only).
  let editSlotDialogOpen = $state(false)
  // svelte-ignore state_referenced_locally
  const {
    form: editSlotForm,
    errors: editSlotErrors,
    enhance: editSlotEnhance,
    delayed: editSlotDelayed,
    message: editSlotMessage,
  } = superForm(data.editSlotForm, {
    id: "editSlot",
    onUpdated: async ({ form }) => {
      if (form.valid) {
        editSlotDialogOpen = false
        await invalidateAll()
      }
    },
  })

  function openCreateSlotDialog() {
    $createSlotForm.label = ""
    $createSlotForm.category = undefined
    $createSlotForm.neededCount = 1
    createSlotDialogOpen = true
  }

  function openEditSlotDialog(slot: EventSlot) {
    $editSlotForm.id = slot.id
    $editSlotForm.label = slot.label
    $editSlotForm.category = slot.category
    $editSlotForm.neededCount = slot.needed_count
    editSlotDialogOpen = true
  }

  // Delete-slot flow (host only).
  let deleteSlotDialogOpen = $state(false)
  let pendingSlotDelete = $state<EventSlot | null>(null)
  // svelte-ignore state_referenced_locally
  const {
    form: deleteSlotForm,
    enhance: deleteSlotEnhance,
    delayed: deleteSlotDelayed,
    message: deleteSlotMessage,
  } = superForm(data.deleteSlotForm, {
    id: "deleteSlot",
    onUpdated: async ({ form }) => {
      if (form.valid) {
        deleteSlotDialogOpen = false
        pendingSlotDelete = null
        await invalidateAll()
      }
    },
  })

  function openDeleteSlotDialog(slot: EventSlot) {
    pendingSlotDelete = slot
    $deleteSlotForm.id = slot.id
    deleteSlotDialogOpen = true
  }

  // Claim-slot flow (any participant). Submits via a hidden id field so it
  // works without opening a dialog — a one-tap "I'll bring this".
  // svelte-ignore state_referenced_locally
  const {
    form: claimSlotForm,
    enhance: claimSlotEnhance,
    message: claimSlotMessage,
  } = superForm(data.claimSlotForm, {
    id: "claimSlot",
    onUpdated: async ({ form }) => {
      if (form.valid) {
        await invalidateAll()
      }
    },
  })

  // Re-derive ownership on the client purely to decide which affordances to
  // show. The server independently enforces the real ownership rule, so this
  // is never the source of truth — only a UI convenience.
  function canModify(item: Item): boolean {
    if (data.isHost) return true
    const owner = participants.find((p) => p.id === item.participant)
    return !!data.currentUserId && owner?.user_id === data.currentUserId
  }

  async function handleRefresh() {
    isRefreshing = true
    try {
      await invalidateAll()
    } finally {
      isRefreshing = false
    }
  }

  // Any open dialog suppresses live refetches so in-progress form input
  // isn't reset out from under the user.
  function anyDialogOpen(): boolean {
    return (
      dialogOpen ||
      editDialogOpen ||
      deleteDialogOpen ||
      rsvpDialogOpen ||
      createSlotDialogOpen ||
      editSlotDialogOpen ||
      deleteSlotDialogOpen
    )
  }

  // ── Keep the shared list feeling live ──────────────────────────────
  // A single SSE connection to /e/[code]/live tells us when another guest
  // changed the board; we then re-run the page load so new contributions
  // appear on their own — no manual refresh. If the live channel can't be
  // held, LiveStore degrades to periodic polling as a safety net. The pulse
  // dot below reflects `live.status` (connected / reconnecting / fallback).
  // svelte-ignore state_referenced_locally
  const live = new LiveStore({
    url: `/e/${data.event.share_code}/live`,
    // A fetch-based SSE reader (see fetch-sse.ts) instead of native
    // EventSource: it streams in both dev and prod, where the void/Vite dev
    // proxy otherwise leaves EventSource stuck in CONNECTING.
    openSource: (url) => connectFetchEventStream(url),
    onChange: async () => {
      // Don't refetch while a dialog is open — it would reset in-progress
      // form input. The store will reconcile again on the next signal/poll.
      if (anyDialogOpen()) return
      await invalidateAll()
    },
  })

  $effect(() => {
    live.start()
    return () => live.stop()
  })

  // Re-fetch when the user returns to the tab, in case we missed a signal
  // while hidden (mobile browsers throttle background connections).
  $effect(() => {
    const onFocus = () => {
      if (
        typeof document !== "undefined" &&
        !document.hidden &&
        !anyDialogOpen()
      ) {
        invalidateAll()
      }
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  })

  // Map live status → pulse dot colour + label.
  const liveLabel = $derived(
    live.status === "connected"
      ? m.event_live_connected()
      : live.status === "fallback"
        ? m.event_live_fallback()
        : m.event_live_reconnecting(),
  )

  // Pull-to-refresh support (mobile gesture)
  let touchStartY = 0
  let isPulling = $state(false)
  let pullDistance = $state(0)

  function handleTouchStart(e: TouchEvent) {
    if (window.scrollY === 0) {
      touchStartY = e.touches[0].clientY
    }
  }

  function handleTouchMove(e: TouchEvent) {
    if (touchStartY === 0) return
    const touchY = e.touches[0].clientY
    const distance = touchY - touchStartY
    if (distance > 0 && window.scrollY === 0) {
      isPulling = true
      pullDistance = Math.min(distance, 80)
      if (distance > 10) e.preventDefault()
    }
  }

  async function handleTouchEnd() {
    if (isPulling && pullDistance > 60) {
      await handleRefresh()
    }
    touchStartY = 0
    isPulling = false
    pullDistance = 0
  }

  // Group items by category
  const itemsByCategory = $derived.by(() => {
    const groups = new Map<ItemCategory, Item[]>()
    CATEGORY_ORDER.forEach((cat) => groups.set(cat, []))
    items.forEach((item) => {
      const cat = item.category as ItemCategory
      if (groups.has(cat)) groups.get(cat)!.push(item as Item)
    })
    return groups
  })

  // Group items by participant
  const itemsByParticipant = $derived.by(() => {
    const groups = new Map<string, Item[]>()
    items.forEach((item) => {
      if (!groups.has(item.participant)) groups.set(item.participant, [])
      groups.get(item.participant)!.push(item as Item)
    })
    return groups
  })

  // Confirmed headcount = sum over "going" participants of (1 + extra_guests).
  // "maybe" heads are tallied separately; "not" simply doesn't count.
  const headcount = $derived(
    computeHeadcount(
      participants.map((p) => ({ rsvp: p.rsvp, extraGuests: p.extra_guests })),
    ),
  )

  // Which essential courses are still empty? (only flag once things start)
  const ESSENTIALS: ItemCategory[] = [
    "apero",
    "entree",
    "plat",
    "dessert",
    "boissons",
  ]
  const gaps = $derived(
    items.length > 0
      ? ESSENTIALS.filter((c) => (itemsByCategory.get(c) || []).length === 0)
      : [],
  )

  // Open (unclaimed) host slots feed the gap hint too: each still-needed slot
  // is surfaced as something the event is short on. The hint shows whenever
  // there's an empty essential course OR an open slot.
  const openSlots = $derived(slots.filter((s) => s.open_count > 0))
  const hasGapHint = $derived(gaps.length > 0 || openSlots.length > 0)

  // Rough "light catering" signal: once a real crowd is confirmed (4+ heads),
  // warn if the number of food/drink contributions is well below the headcount
  // (fewer than one edible per two confirmed heads). Purely a nudge — never a
  // hard rule.
  const FOOD_CATEGORIES: ItemCategory[] = [
    "apero",
    "entree",
    "plat",
    "dessert",
    "boissons",
  ]
  const foodItemCount = $derived(
    items.filter((i) => FOOD_CATEGORIES.includes(i.category as ItemCategory))
      .length,
  )
  const cateringLooksLight = $derived(
    headcount.confirmed >= 4 && foodItemCount * 2 < headcount.confirmed,
  )

  function getParticipantName(participantId: string): string {
    return (
      participants.find((p) => p.id === participantId)?.name ||
      m.event_participant_unknown()
    )
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return new Intl.DateTimeFormat(getLocale(), {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(data.event.share_code)
      copied = true
      setTimeout(() => (copied = false), 1600)
    } catch (err) {
      log("error", "Failed to copy code", { error: String(err) })
    }
  }

  async function shareEvent() {
    const shareUrl = localizeHref(`/e/${data.event.share_code}`)
    const shareText = m.event_share_text({
      name: data.event.name,
      url: shareUrl,
    })
    try {
      if (navigator.share) {
        await navigator.share({
          title: data.event.name,
          text: shareText,
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert(m.event_share_clipboard())
      }
    } catch (err) {
      log("error", "Failed to share", { error: String(err) })
    }
  }
</script>

{#snippet itemRow(
  item: Item,
  emoji: string,
  secondary: string,
  accent: string,
)}
  <li
    class="animate-pop-in flex items-center gap-3 rounded-xl border-l-[3px] bg-background/55 py-2.5 pr-3 pl-3"
    style="border-color:{accent}"
  >
    {#if emoji}
      <span class="text-lg leading-none" aria-hidden="true">{emoji}</span>
    {/if}
    <div class="min-w-0 flex-1">
      <p class="leading-tight font-semibold">{item.name}</p>
      <p class="text-sm text-muted-foreground">{secondary}</p>
      {#if item.dietary_tags && item.dietary_tags.length > 0}
        <div class="mt-1 flex flex-wrap gap-1" aria-label="dietary tags">
          {#each item.dietary_tags as tag (tag)}
            {#if DIETARY_TAGS[tag]}
              <span
                class="inline-flex items-center gap-0.5 rounded-full border border-border bg-secondary/60 px-1.5 py-0.5 text-xs font-medium text-secondary-foreground"
                data-dietary-tag={tag}
              >
                <span aria-hidden="true">{DIETARY_TAGS[tag].emoji}</span>
                {DIETARY_TAGS[tag].label()}
              </span>
            {/if}
          {/each}
        </div>
      {/if}
    </div>
    {#if canModify(item)}
      <div
        class="flex shrink-0 items-center gap-1"
        aria-label={m.event_item_actions_label({ name: item.name })}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-8 text-muted-foreground hover:text-foreground"
          onclick={() => openEditDialog(item)}
          aria-label={m.event_item_edit()}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="size-8 text-muted-foreground hover:text-destructive"
          onclick={() => openDeleteDialog(item)}
          aria-label={m.event_item_delete()}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    {/if}
  </li>
{/snippet}

<div
  class="min-h-screen px-4 pt-4 pb-28"
  role="main"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  {#if isPulling}
    <div
      class="fixed top-0 right-0 left-0 z-50 flex items-center justify-center text-primary transition-all"
      style="height: {pullDistance}px; opacity: {pullDistance / 80}"
    >
      <RefreshCw class={pullDistance > 60 ? "animate-spin" : ""} />
    </div>
  {/if}

  <div
    class="mx-auto max-w-2xl space-y-5"
    style="padding-top: {isPulling ? pullDistance : 0}px"
  >
    <!-- Event header -->
    <header class="card-pop animate-pop-in relative overflow-hidden rounded-3xl bg-card p-5">
      <div
        class="pointer-events-none absolute -top-6 -right-4 text-7xl opacity-10 select-none"
        aria-hidden="true"
      >
        🍲
      </div>
      <h1 class="font-display text-3xl leading-tight font-semibold tracking-tight">
        {data.event.name}
      </h1>

      <div class="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div class="flex items-center gap-2">
          <Calendar class="size-4 shrink-0 text-primary" />
          <span class="capitalize">{formatDate(data.event.date)}</span>
          <a
            href="/e/{data.event.share_code}/event.ics"
            download
            class="ml-1 inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label={m.event_add_to_calendar()}
          >
            <Calendar class="size-3" aria-hidden="true" />
            {m.event_add_to_calendar()}
          </a>
        </div>
        {#if data.event.location}
          <div class="flex items-center gap-2">
            <MapPin class="size-4 shrink-0 text-primary" />
            <a
              href="https://www.google.com/maps/search/?api=1&query={encodeURIComponent(data.event.location)}"
              target="_blank"
              rel="noopener noreferrer"
              class="underline decoration-dotted underline-offset-2 hover:text-foreground"
              aria-label="{m.event_location_maps_label()}: {data.event.location}"
            >{data.event.location}</a>
          </div>
        {/if}
        <div class="flex items-center gap-2">
          <Users class="size-4 shrink-0 text-primary" />
          <span>
            {#if headcount.confirmed > 0}
              {m.event_headcount_confirmed({ count: headcount.confirmed })}{#if headcount.maybe > 0}
                · {m.event_headcount_maybe({ count: headcount.maybe })}{/if}
            {:else if headcount.maybe > 0}
              {m.event_headcount_maybe({ count: headcount.maybe })}
            {:else}
              {m.event_headcount_none()}
            {/if}
          </span>
        </div>
      </div>

      {#if data.currentParticipant}
        <div class="mt-3">
          <Button
            variant="outline"
            size="sm"
            onclick={openRsvpDialog}
            data-rsvp={data.currentParticipant.rsvp}
          >
            {#if data.currentParticipant.rsvp === "going"}
              {m.event_rsvp_going()}{#if data.currentParticipant.extra_guests > 0}
                · +{data.currentParticipant.extra_guests}{/if}
            {:else if data.currentParticipant.rsvp === "maybe"}
              {m.event_rsvp_maybe()}
            {:else}
              {m.event_rsvp_not()}
            {/if}
          </Button>
        </div>
      {/if}

      {#if data.event.description}
        <p class="mt-3 text-sm">{data.event.description}</p>
      {/if}

      <div class="mt-4 flex items-center gap-2">
        <button
          type="button"
          onclick={copyCode}
          class="code-chip group inline-flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-border-strong/60 bg-secondary/50 px-3 py-2 font-bold text-secondary-foreground transition-colors hover:bg-secondary"
          title={data.event.share_code}
        >
          {data.event.share_code}
          {#if copied}
            <Check class="size-4 text-[var(--cat-entree)]" />
          {:else}
            <Copy class="size-4 text-muted-foreground group-hover:text-foreground" />
          {/if}
        </button>
        <QrDialog
          url="{page.url.origin}{localizeHref(`/e/${data.event.share_code}`)}"
          eventName={data.event.name}
        />
        <Button variant="default" size="default" onclick={shareEvent} class="flex-1">
          {m.event_share_button()}
        </Button>
      </div>
    </header>

    <!-- Push reminders opt-in (issue #7). Scoped to this event. -->
    <PushOptIn
      vapidPublicKey={data.vapidPublicKey ?? null}
      eventId={Number(data.event.id)}
    />

    <!-- Gap hint: empty essential courses + unclaimed host slots -->
    {#if hasGapHint}
      <div
        class="animate-pop-in flex flex-wrap items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-primary/40 bg-primary/8 px-4 py-3"
      >
        <span class="text-sm font-semibold text-primary">
          {m.event_gap_title()} —
        </span>
        {#each openSlots as slot (slot.id)}
          <span
            class="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-sm font-medium shadow-sm"
            style="border:1px solid {slot.category
              ? CATEGORIES[slot.category].color
              : 'var(--cat-autre)'}"
            data-open-slot={slot.id}
          >
            {#if slot.category}{CATEGORIES[slot.category].emoji}{:else}🎁{/if}
            {slot.label}
            {#if slot.open_count > 1}
              <span class="text-xs text-muted-foreground"
                >×{slot.open_count}</span
              >
            {/if}
          </span>
        {/each}
        {#each gaps as cat (cat)}
          <span
            class="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-sm font-medium shadow-sm"
            style="border:1px solid {CATEGORIES[cat].color}"
          >
            {CATEGORIES[cat].emoji}
            {CATEGORIES[cat].label()}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Headcount gap hint: catering looks light vs. the confirmed crowd. -->
    {#if cateringLooksLight}
      <div
        class="animate-pop-in flex items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-amber-500/50 bg-amber-500/10 px-4 py-3"
      >
        <span class="text-sm font-medium text-amber-700 dark:text-amber-400">
          🍽️ {m.event_headcount_gap({ count: headcount.confirmed })}
        </span>
      </div>
    {/if}

    <!-- Host wishlist / needed slots (issue #5) -->
    {#if data.isHost || slots.length > 0}
      <section class="card-pop animate-pop-in overflow-hidden rounded-2xl bg-card">
        <header class="flex items-center gap-3 bg-secondary/40 px-4 py-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-lg text-primary shadow-sm"
            aria-hidden="true"
          >
            <Gift class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="font-display text-lg font-semibold tracking-tight">
              {m.event_slots_title()}
            </h2>
            {#if data.isHost}
              <p class="text-xs text-muted-foreground">
                {m.event_slots_host_hint()}
              </p>
            {/if}
          </div>
          {#if data.isHost}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onclick={openCreateSlotDialog}
            >
              <Plus class="size-4" />
              {m.event_slots_add_trigger()}
            </Button>
          {/if}
        </header>

        {#if slots.length === 0}
          <p class="px-4 py-5 text-center text-sm text-muted-foreground">
            {m.event_slots_empty_host()}
          </p>
        {:else}
          <ul class="space-y-2 p-3">
            {#each slots as slot (slot.id)}
              {@const slotCat = slot.category
                ? CATEGORIES[slot.category]
                : null}
              <li
                class="flex items-center gap-3 rounded-xl border-l-[3px] bg-background/55 py-2.5 pr-3 pl-3"
                style="border-color:{slotCat
                  ? slotCat.color
                  : 'var(--cat-autre)'}"
                data-slot={slot.id}
                data-slot-open={slot.open_count}
              >
                <span class="text-lg leading-none" aria-hidden="true">
                  {#if slotCat}{slotCat.emoji}{:else}🎁{/if}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="leading-tight font-semibold">{slot.label}</p>
                  <p class="text-sm text-muted-foreground">
                    {m.event_slots_progress({
                      claimed: slot.claimed_count,
                      needed: slot.needed_count,
                    })}
                    {#if slot.open_count > 0}
                      · {m.event_slots_open_label({ count: slot.open_count })}
                    {:else}
                      · {m.event_slots_filled_label()}
                    {/if}
                  </p>
                </div>

                {#if slot.open_count > 0}
                  <form
                    method="POST"
                    action="?/claimSlot"
                    use:claimSlotEnhance
                    class="shrink-0"
                  >
                    <input type="hidden" name="id" value={slot.id} />
                    <Button type="submit" size="sm" data-claim-slot={slot.id}>
                      <HandHeart class="size-4" />
                      {m.event_slots_claim()}
                    </Button>
                  </form>
                {/if}

                {#if data.isHost}
                  <div
                    class="flex shrink-0 items-center gap-1"
                    aria-label={m.event_slot_actions_label({
                      label: slot.label,
                    })}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-8 text-muted-foreground hover:text-foreground"
                      onclick={() => openEditSlotDialog(slot)}
                      aria-label={m.event_item_edit()}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-8 text-muted-foreground hover:text-destructive"
                      onclick={() => openDeleteSlotDialog(slot)}
                      aria-label={m.event_item_delete()}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
        {#if $claimSlotMessage}
          <p class="px-4 pb-3 text-sm text-destructive">{$claimSlotMessage}</p>
        {/if}
      </section>
    {/if}

    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-2">
      <ToggleGroup
        value={viewMode}
        onValueChange={(value) =>
          value && setViewMode(value as "category" | "person")}
        type="single"
      >
        <ToggleGroupItem value="category">
          {m.event_view_by_category()}
        </ToggleGroupItem>
        <ToggleGroupItem value="person">
          {m.event_view_by_person()}
        </ToggleGroupItem>
      </ToggleGroup>

      <div class="flex items-center gap-2">
        <span
          class="relative flex size-2.5"
          title={liveLabel}
          role="status"
          aria-label={liveLabel}
          data-live-status={live.status}
        >
          {#if live.status === "connected"}
            <span
              class="absolute inline-flex size-full animate-ping rounded-full bg-[var(--cat-entree)] opacity-70"
            ></span>
            <span
              class="relative inline-flex size-2.5 rounded-full bg-[var(--cat-entree)]"
            ></span>
          {:else if live.status === "fallback"}
            <span
              class="relative inline-flex size-2.5 rounded-full bg-muted-foreground/60"
            ></span>
          {:else}
            <span
              class="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-70"
            ></span>
            <span
              class="relative inline-flex size-2.5 rounded-full bg-amber-400"
            ></span>
          {/if}
        </span>
        <Button
          variant="outline"
          size="icon"
          onclick={handleRefresh}
          disabled={isRefreshing}
          aria-label={m.event_refresh()}
        >
          <RefreshCw class={isRefreshing ? "animate-spin" : ""} size={16} />
        </Button>
      </div>
    </div>

    <!-- Items -->
    {#if items.length === 0}
      <div
        class="card-pop animate-pop-in flex flex-col items-center gap-2 rounded-3xl bg-card px-6 py-14 text-center"
      >
        <span class="text-5xl" aria-hidden="true">🍽️</span>
        <p class="font-display text-lg font-semibold">{m.event_no_items()}</p>
        <p class="text-sm text-muted-foreground">{m.event_no_items_cta()}</p>
      </div>
    {:else if viewMode === "category"}
      <div class="space-y-4">
        {#each CATEGORY_ORDER as category (category)}
          {@const categoryItems = itemsByCategory.get(category) || []}
          {#if categoryItems.length > 0}
            {@const cat = CATEGORIES[category]}
            <section class="card-pop overflow-hidden rounded-2xl bg-card">
              <header
                class="flex items-center gap-3 px-4 py-3"
                style="background: color-mix(in oklab, {cat.color}, transparent 90%)"
              >
                <span
                  class="grid size-10 shrink-0 place-items-center rounded-xl text-xl"
                  style="background: color-mix(in oklab, {cat.color}, white 76%)"
                  aria-hidden="true"
                >
                  {cat.emoji}
                </span>
                <h2 class="font-display flex-1 text-lg font-semibold tracking-tight">
                  {cat.label()}
                </h2>
                <span
                  class="grid size-7 place-items-center rounded-full text-sm font-bold text-white"
                  style="background:{cat.color}"
                >
                  {categoryItems.length}
                </span>
              </header>
              <ul class="space-y-2 p-3">
                {#each categoryItems as item (item.id)}
                  {@render itemRow(
                    item,
                    "",
                    `${m.event_item_by_participant({ name: getParticipantName(item.participant) })}${item.quantity ? ` · ${item.quantity}` : ""}`,
                    cat.color,
                  )}
                {/each}
              </ul>
            </section>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="space-y-4">
        {#each participants as participant (participant.id)}
          {@const personItems = itemsByParticipant.get(participant.id) || []}
          {#if personItems.length > 0}
            <section class="card-pop overflow-hidden rounded-2xl bg-card">
              <header class="flex items-center gap-3 bg-secondary/40 px-4 py-3">
                <span
                  class="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-lg font-bold text-primary shadow-sm"
                  aria-hidden="true"
                >
                  {participant.name.charAt(0).toUpperCase()}
                </span>
                <h2 class="font-display flex-1 text-lg font-semibold tracking-tight">
                  {participant.name}
                </h2>
                {#if participant.is_host}
                  <Badge variant="default">{m.event_role_host()}</Badge>
                {/if}
              </header>
              <ul class="space-y-2 p-3">
                {#each personItems as item (item.id)}
                  {@const cat = CATEGORIES[item.category as ItemCategory]}
                  {@render itemRow(
                    item,
                    cat.emoji,
                    `${cat.label()}${item.quantity ? ` · ${item.quantity}` : ""}`,
                    cat.color,
                  )}
                {/each}
              </ul>
            </section>
          {/if}
        {/each}
      </div>
    {/if}
  </div>

  <!-- Sticky add button -->
  <Button
    size="lg"
    onclick={() => (dialogOpen = true)}
    class="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 shadow-[0_6px_20px_-4px_oklch(0.5_0.18_34/0.55)]"
    style="bottom: calc(1.25rem + env(safe-area-inset-bottom))"
  >
    <Plus />
    {m.event_add_item_trigger()}
  </Button>

  <!-- Add item dialog -->
  <Dialog bind:open={dialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="font-display text-xl"
          >{m.event_add_item_dialog_title()}</DialogTitle
        >
      </DialogHeader>
      <form method="POST" action="?/addItem" use:enhance class="space-y-4">
        <div class="space-y-2">
          <Label for="item-name">{m.event_field_item_name_label()}</Label>
          <Input
            id="item-name"
            name="name"
            autocomplete="off"
            data-1p-ignore
            data-lpignore="true"
            bind:value={$form.name}
            placeholder={m.event_field_item_name_placeholder()}
            required
            aria-invalid={$errors.name ? "true" : undefined}
          />
          {#if $errors.name}
            <p class="text-sm text-destructive">{$errors.name}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="category">{m.event_field_category_label()}</Label>
          <Select name="category" bind:value={$form.category} type="single">
            <SelectTrigger>
              {#if $form.category}
                {CATEGORIES[$form.category as ItemCategory].emoji}
                {CATEGORIES[$form.category as ItemCategory].label()}
              {/if}
            </SelectTrigger>
            <SelectContent>
              {#each CATEGORY_ORDER as cat (cat)}
                <SelectItem value={cat} label={CATEGORIES[cat].label()}>
                  {CATEGORIES[cat].emoji}
                  {CATEGORIES[cat].label()}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
          {#if $errors.category}
            <p class="text-sm text-destructive">{$errors.category}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="quantity">{m.event_field_quantity_label()}</Label>
          <Input
            id="quantity"
            name="quantity"
            bind:value={$form.quantity}
            placeholder={m.event_field_quantity_placeholder()}
          />
        </div>

        {#if showAddDietaryTags}
          <div class="space-y-2">
            <Label>{m.event_field_dietary_tags_label()}</Label>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label={m.event_field_dietary_tags_label()}>
              {#each VALID_DIETARY_TAGS as tag (tag)}
                {@const isSelected = $form.dietaryTags?.includes(tag)}
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/50 text-secondary-foreground hover:bg-secondary'}"
                  aria-pressed={isSelected}
                  data-tag={tag}
                  onclick={() => {
                    const current = $form.dietaryTags ?? []
                    $form.dietaryTags = isSelected
                      ? current.filter((t) => t !== tag)
                      : [...current, tag]
                  }}
                >
                  <span aria-hidden="true">{DIETARY_TAGS[tag].emoji}</span>
                  {DIETARY_TAGS[tag].label()}
                </button>
              {/each}
            </div>
            {#each $form.dietaryTags ?? [] as tag (tag)}
              <input type="hidden" name="dietaryTags" value={tag} />
            {/each}
          </div>
        {/if}

        {#if $message}
          <p class="text-sm text-destructive">{$message}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onclick={() => (dialogOpen = false)}
            class="flex-1"
          >
            {m.common_cancel()}
          </Button>
          <Button type="submit" class="flex-1" disabled={$delayed}>
            {$delayed
              ? m.event_add_item_submitting()
              : m.event_add_item_submit()}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Edit item dialog -->
  <Dialog bind:open={editDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="font-display text-xl"
          >{m.event_edit_item_dialog_title()}</DialogTitle
        >
      </DialogHeader>
      <form
        method="POST"
        action="?/editItem"
        use:editEnhance
        class="space-y-4"
      >
        <input type="hidden" name="id" bind:value={$editFormData.id} />
        <div class="space-y-2">
          <Label for="edit-item-name">{m.event_field_item_name_label()}</Label>
          <Input
            id="edit-item-name"
            name="name"
            autocomplete="off"
            data-1p-ignore
            data-lpignore="true"
            bind:value={$editFormData.name}
            placeholder={m.event_field_item_name_placeholder()}
            required
            aria-invalid={$editErrors.name ? "true" : undefined}
          />
          {#if $editErrors.name}
            <p class="text-sm text-destructive">{$editErrors.name}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="edit-category">{m.event_field_category_label()}</Label>
          <Select
            name="category"
            bind:value={$editFormData.category}
            type="single"
          >
            <SelectTrigger>
              {#if $editFormData.category}
                {CATEGORIES[$editFormData.category as ItemCategory].emoji}
                {CATEGORIES[$editFormData.category as ItemCategory].label()}
              {/if}
            </SelectTrigger>
            <SelectContent>
              {#each CATEGORY_ORDER as cat (cat)}
                <SelectItem value={cat} label={CATEGORIES[cat].label()}>
                  {CATEGORIES[cat].emoji}
                  {CATEGORIES[cat].label()}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
          {#if $editErrors.category}
            <p class="text-sm text-destructive">{$editErrors.category}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="edit-quantity">{m.event_field_quantity_label()}</Label>
          <Input
            id="edit-quantity"
            name="quantity"
            bind:value={$editFormData.quantity}
            placeholder={m.event_field_quantity_placeholder()}
          />
        </div>

        {#if showEditDietaryTags}
          <div class="space-y-2">
            <Label>{m.event_field_dietary_tags_label()}</Label>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label={m.event_field_dietary_tags_label()}>
              {#each VALID_DIETARY_TAGS as tag (tag)}
                {@const isSelected = $editFormData.dietaryTags?.includes(tag)}
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors {isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary/50 text-secondary-foreground hover:bg-secondary'}"
                  aria-pressed={isSelected}
                  data-tag={tag}
                  onclick={() => {
                    const current = $editFormData.dietaryTags ?? []
                    $editFormData.dietaryTags = isSelected
                      ? current.filter((t) => t !== tag)
                      : [...current, tag]
                  }}
                >
                  <span aria-hidden="true">{DIETARY_TAGS[tag].emoji}</span>
                  {DIETARY_TAGS[tag].label()}
                </button>
              {/each}
            </div>
            {#each $editFormData.dietaryTags ?? [] as tag (tag)}
              <input type="hidden" name="dietaryTags" value={tag} />
            {/each}
          </div>
        {/if}

        {#if $editMessage}
          <p class="text-sm text-destructive">{$editMessage}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onclick={() => (editDialogOpen = false)}
            class="flex-1"
          >
            {m.common_cancel()}
          </Button>
          <Button type="submit" class="flex-1" disabled={$editDelayed}>
            {$editDelayed
              ? m.event_edit_item_submitting()
              : m.event_edit_item_submit()}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Delete confirmation dialog -->
  <Dialog bind:open={deleteDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="font-display text-xl"
          >{m.event_delete_item_dialog_title()}</DialogTitle
        >
      </DialogHeader>
      <p class="text-sm text-muted-foreground">
        {m.event_delete_item_dialog_description({
          name: pendingDelete?.name ?? "",
        })}
      </p>
      <form
        method="POST"
        action="?/deleteItem"
        use:deleteEnhance
        class="space-y-4"
      >
        <input type="hidden" name="id" bind:value={$deleteFormData.id} />

        {#if $deleteMessage}
          <p class="text-sm text-destructive">{$deleteMessage}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onclick={() => (deleteDialogOpen = false)}
            class="flex-1"
          >
            {m.common_cancel()}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            class="flex-1"
            disabled={$deleteDelayed}
          >
            {$deleteDelayed
              ? m.event_delete_item_submitting()
              : m.event_delete_item_confirm()}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <!-- RSVP dialog -->
  <Dialog bind:open={rsvpDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="font-display text-xl">
          {m.event_rsvp_title()}
        </DialogTitle>
      </DialogHeader>
      <form method="POST" action="?/setRsvp" use:rsvpEnhance class="space-y-4">
        {#if data.isHost}
          <!-- Host is always "going" — only let them set their +1s. -->
          <input type="hidden" name="rsvp" value="going" />
        {:else}
          <input type="hidden" name="rsvp" value={$rsvpFormData.rsvp} />
          <ToggleGroup
            value={$rsvpFormData.rsvp}
            onValueChange={(value) => {
              if (value) $rsvpFormData.rsvp = value as "going" | "maybe" | "not"
            }}
            type="single"
            class="w-full"
            data-rsvp-toggle
          >
            <ToggleGroupItem value="going" class="flex-1">
              {m.event_rsvp_going()}
            </ToggleGroupItem>
            <ToggleGroupItem value="maybe" class="flex-1">
              {m.event_rsvp_maybe()}
            </ToggleGroupItem>
            <ToggleGroupItem value="not" class="flex-1">
              {m.event_rsvp_not()}
            </ToggleGroupItem>
          </ToggleGroup>
        {/if}

        <div class="space-y-2">
          <Label for="extraGuests">{m.event_rsvp_extra_label()}</Label>
          <Input
            id="extraGuests"
            name="extraGuests"
            type="number"
            min="0"
            max="50"
            bind:value={$rsvpFormData.extraGuests}
            disabled={!data.isHost && $rsvpFormData.rsvp === "not"}
          />
          <p class="text-sm text-muted-foreground">
            {#if data.isHost}
              {m.event_rsvp_host_extra_hint()}
            {:else}
              {m.event_rsvp_extra_hint()}
            {/if}
          </p>
        </div>

        {#if $rsvpMessage}
          <p class="text-sm text-destructive">{$rsvpMessage}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onclick={() => (rsvpDialogOpen = false)}
            class="flex-1"
          >
            {m.common_cancel()}
          </Button>
          <Button type="submit" class="flex-1" disabled={$rsvpDelayed}>
            {$rsvpDelayed ? m.event_rsvp_saving() : m.event_rsvp_save()}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Create slot dialog (host) -->
  <Dialog bind:open={createSlotDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="font-display text-xl">
          {m.event_slots_add_dialog_title()}
        </DialogTitle>
      </DialogHeader>
      <form
        method="POST"
        action="?/createSlot"
        use:createSlotEnhance
        class="space-y-4"
      >
        <div class="space-y-2">
          <Label for="slot-label">{m.event_slots_field_label()}</Label>
          <Input
            id="slot-label"
            name="label"
            bind:value={$createSlotForm.label}
            placeholder={m.event_slots_field_label_placeholder()}
            required
            aria-invalid={$createSlotErrors.label ? "true" : undefined}
          />
          {#if $createSlotErrors.label}
            <p class="text-sm text-destructive">{$createSlotErrors.label}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="slot-count">{m.event_slots_field_count()}</Label>
          <Input
            id="slot-count"
            name="neededCount"
            type="number"
            min="1"
            max="99"
            bind:value={$createSlotForm.neededCount}
          />
          {#if $createSlotErrors.neededCount}
            <p class="text-sm text-destructive">
              {$createSlotErrors.neededCount}
            </p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="slot-category">{m.event_slots_field_category()}</Label>
          <Select
            name="category"
            bind:value={$createSlotForm.category}
            type="single"
          >
            <SelectTrigger>
              {#if $createSlotForm.category}
                {CATEGORIES[$createSlotForm.category].emoji}
                {CATEGORIES[$createSlotForm.category].label()}
              {:else}
                {m.event_slots_category_none()}
              {/if}
            </SelectTrigger>
            <SelectContent>
              {#each CATEGORY_ORDER as cat (cat)}
                <SelectItem value={cat} label={CATEGORIES[cat].label()}>
                  {CATEGORIES[cat].emoji}
                  {CATEGORIES[cat].label()}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>

        {#if $createSlotMessage}
          <p class="text-sm text-destructive">{$createSlotMessage}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onclick={() => (createSlotDialogOpen = false)}
            class="flex-1"
          >
            {m.common_cancel()}
          </Button>
          <Button type="submit" class="flex-1" disabled={$createSlotDelayed}>
            {$createSlotDelayed
              ? m.event_slots_saving()
              : m.event_slots_save()}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Edit slot dialog (host) -->
  <Dialog bind:open={editSlotDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="font-display text-xl">
          {m.event_slots_edit_dialog_title()}
        </DialogTitle>
      </DialogHeader>
      <form
        method="POST"
        action="?/editSlot"
        use:editSlotEnhance
        class="space-y-4"
      >
        <input type="hidden" name="id" bind:value={$editSlotForm.id} />
        <div class="space-y-2">
          <Label for="edit-slot-label">{m.event_slots_field_label()}</Label>
          <Input
            id="edit-slot-label"
            name="label"
            bind:value={$editSlotForm.label}
            placeholder={m.event_slots_field_label_placeholder()}
            required
            aria-invalid={$editSlotErrors.label ? "true" : undefined}
          />
          {#if $editSlotErrors.label}
            <p class="text-sm text-destructive">{$editSlotErrors.label}</p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="edit-slot-count">{m.event_slots_field_count()}</Label>
          <Input
            id="edit-slot-count"
            name="neededCount"
            type="number"
            min="1"
            max="99"
            bind:value={$editSlotForm.neededCount}
          />
          {#if $editSlotErrors.neededCount}
            <p class="text-sm text-destructive">
              {$editSlotErrors.neededCount}
            </p>
          {/if}
        </div>

        <div class="space-y-2">
          <Label for="edit-slot-category">
            {m.event_slots_field_category()}
          </Label>
          <Select
            name="category"
            bind:value={$editSlotForm.category}
            type="single"
          >
            <SelectTrigger>
              {#if $editSlotForm.category}
                {CATEGORIES[$editSlotForm.category].emoji}
                {CATEGORIES[$editSlotForm.category].label()}
              {:else}
                {m.event_slots_category_none()}
              {/if}
            </SelectTrigger>
            <SelectContent>
              {#each CATEGORY_ORDER as cat (cat)}
                <SelectItem value={cat} label={CATEGORIES[cat].label()}>
                  {CATEGORIES[cat].emoji}
                  {CATEGORIES[cat].label()}
                </SelectItem>
              {/each}
            </SelectContent>
          </Select>
        </div>

        {#if $editSlotMessage}
          <p class="text-sm text-destructive">{$editSlotMessage}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onclick={() => (editSlotDialogOpen = false)}
            class="flex-1"
          >
            {m.common_cancel()}
          </Button>
          <Button type="submit" class="flex-1" disabled={$editSlotDelayed}>
            {$editSlotDelayed ? m.event_slots_saving() : m.event_slots_save()}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>

  <!-- Delete slot dialog (host) -->
  <Dialog bind:open={deleteSlotDialogOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle class="font-display text-xl">
          {m.event_slots_delete_dialog_title()}
        </DialogTitle>
      </DialogHeader>
      <p class="text-sm text-muted-foreground">
        {m.event_slots_delete_dialog_description({
          label: pendingSlotDelete?.label ?? "",
        })}
      </p>
      <form
        method="POST"
        action="?/deleteSlot"
        use:deleteSlotEnhance
        class="space-y-4"
      >
        <input type="hidden" name="id" bind:value={$deleteSlotForm.id} />

        {#if $deleteSlotMessage}
          <p class="text-sm text-destructive">{$deleteSlotMessage}</p>
        {/if}

        <div class="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onclick={() => (deleteSlotDialogOpen = false)}
            class="flex-1"
          >
            {m.common_cancel()}
          </Button>
          <Button
            type="submit"
            variant="destructive"
            class="flex-1"
            disabled={$deleteSlotDelayed}
          >
            {$deleteSlotDelayed
              ? m.event_delete_item_submitting()
              : m.event_delete_item_confirm()}
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</div>
