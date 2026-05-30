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
    type Item,
    type ItemCategory,
  } from "$lib/types/index"
  import { log } from "$lib/utils/logger"
  import { superForm } from "sveltekit-superforms/client"
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
  } from "@lucide/svelte"
  import * as m from "$lib/paraglide/messages"
  import { getLocale, localizeHref } from "$lib/paraglide/runtime"
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
    editDialogOpen = true
  }

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
      if (dialogOpen || editDialogOpen || deleteDialogOpen) return
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
        !dialogOpen &&
        !editDialogOpen &&
        !deleteDialogOpen
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
        </div>
        {#if data.event.location}
          <div class="flex items-center gap-2">
            <MapPin class="size-4 shrink-0 text-primary" />
            <span>{data.event.location}</span>
          </div>
        {/if}
        <div class="flex items-center gap-2">
          <Users class="size-4 shrink-0 text-primary" />
          <span>{m.event_guests_count({ count: participants.length })}</span>
        </div>
      </div>

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
        <Button variant="default" size="default" onclick={shareEvent} class="flex-1">
          {m.event_share_button()}
        </Button>
      </div>
    </header>

    <!-- Gap hint -->
    {#if gaps.length > 0}
      <div
        class="animate-pop-in flex flex-wrap items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-primary/40 bg-primary/8 px-4 py-3"
      >
        <span class="text-sm font-semibold text-primary">
          {m.event_gap_title()} —
        </span>
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
          <Label for="name">{m.event_field_item_name_label()}</Label>
          <Input
            id="name"
            name="name"
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
          <Label for="edit-name">{m.event_field_item_name_label()}</Label>
          <Input
            id="edit-name"
            name="name"
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
</div>
