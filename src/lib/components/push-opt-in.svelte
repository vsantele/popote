<script lang="ts">
  import { onMount } from "svelte"
  import { Button } from "$lib/components/ui/button"
  import { Bell, BellOff, BellRing } from "@lucide/svelte"
  import {
    isPushSupported,
    getExistingSubscription,
    subscribeToPush,
    unsubscribeFromPush,
  } from "$lib/push/client"
  import { log } from "$lib/utils/logger"
  import * as m from "$lib/paraglide/messages"

  // The public VAPID key (from the layout server load) and an optional event id
  // to scope the subscription. When `vapidPublicKey` is null, push is disabled
  // server-side and the control hides itself.
  let {
    vapidPublicKey,
    eventId = null,
  }: { vapidPublicKey: string | null; eventId?: number | null } = $props()

  type UiState = "loading" | "unsupported" | "idle" | "subscribed" | "denied"

  let uiState: UiState = $state("loading")
  let busy = $state(false)
  let errorMessage: string | null = $state(null)

  const enabled = $derived(Boolean(vapidPublicKey))

  onMount(async () => {
    if (!enabled) {
      uiState = "unsupported"
      return
    }
    if (!isPushSupported()) {
      uiState = "unsupported"
      return
    }
    if (Notification.permission === "denied") {
      uiState = "denied"
      return
    }
    try {
      const existing = await getExistingSubscription()
      uiState = existing ? "subscribed" : "idle"
    } catch (err) {
      log("warn", "Failed to read push subscription", { error: String(err) })
      uiState = "idle"
    }
  })

  // Opt-in. MUST run from this click handler (a user gesture) so the browser
  // permission prompt is allowed — never auto-prompted on load.
  async function enable() {
    if (!vapidPublicKey) return
    busy = true
    errorMessage = null
    try {
      await subscribeToPush({ vapidPublicKey, eventId })
      uiState = "subscribed"
    } catch (err) {
      const msg = String(err)
      if (msg.includes("denied")) {
        uiState = "denied"
      } else {
        errorMessage = m.push_error()
      }
      log("warn", "Push opt-in failed", { error: msg })
    } finally {
      busy = false
    }
  }

  async function disable() {
    busy = true
    errorMessage = null
    try {
      await unsubscribeFromPush()
      uiState = "idle"
    } catch (err) {
      errorMessage = m.push_error()
      log("warn", "Push opt-out failed", { error: String(err) })
    } finally {
      busy = false
    }
  }
</script>

{#if uiState !== "unsupported" && uiState !== "loading"}
  <div
    class="card-pop animate-pop-in flex items-start gap-3 rounded-2xl bg-card p-4"
    data-push-state={uiState}
  >
    <span
      class="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
      aria-hidden="true"
    >
      {#if uiState === "subscribed"}
        <BellRing class="size-5" />
      {:else}
        <Bell class="size-5" />
      {/if}
    </span>
    <div class="min-w-0 flex-1">
      <p class="font-display font-semibold">{m.push_title()}</p>
      <p class="text-sm text-muted-foreground">{m.push_description()}</p>

      {#if uiState === "denied"}
        <p class="mt-2 text-sm text-destructive">{m.push_denied()}</p>
      {:else if errorMessage}
        <p class="mt-2 text-sm text-destructive">{errorMessage}</p>
      {/if}

      <div class="mt-3">
        {#if uiState === "subscribed"}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={disable}
            disabled={busy}
          >
            <BellOff class="size-4" />
            {m.push_disable()}
          </Button>
        {:else if uiState === "idle"}
          <Button
            type="button"
            variant="default"
            size="sm"
            onclick={enable}
            disabled={busy}
          >
            <Bell class="size-4" />
            {busy ? m.push_enabling() : m.push_enable()}
          </Button>
        {/if}
      </div>
    </div>
  </div>
{/if}
