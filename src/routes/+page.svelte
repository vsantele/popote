<script lang="ts">
  import { Button } from "$lib/components/ui/button"
  import { Card, CardContent } from "$lib/components/ui/card"
  import { Input } from "$lib/components/ui/input"
  import { Label } from "$lib/components/ui/label"
  import { superForm } from "sveltekit-superforms"
  import * as m from "$lib/paraglide/messages"
  import { getLocale, localizeHref } from "$lib/paraglide/runtime"
  import LocaleSwitcher from "$lib/components/locale-switcher.svelte"
  import BrandMark from "$lib/components/brand-mark.svelte"
  import { ArrowRight, Plus } from "@lucide/svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  // svelte-ignore state_referenced_locally
  const { form, enhance } = superForm(data.joinForm)

  const allEvents = $derived([
    ...data.hosted.map((e) => ({ ...e, hosted: true })),
    ...data.joined.map((e) => ({ ...e, hosted: false })),
  ])

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString(getLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }
</script>

<div class="min-h-screen px-4 pb-16">
  <div class="mx-auto w-full max-w-md">
    <!-- top bar -->
    <div class="flex items-center justify-end gap-2 pt-4">
      <LocaleSwitcher />
      <Button href={localizeHref("/account")} variant="ghost" size="sm">
        {m.nav_account()}
      </Button>
    </div>

    <!-- hero -->
    <div class="animate-pop-in flex flex-col items-center pt-6 pb-9 text-center">
      <BrandMark size={92} class="drop-shadow-sm" />
      <h1 class="wordmark mt-3 text-6xl text-foreground">Popote</h1>
      <p class="mt-2 max-w-xs text-pretty text-muted-foreground">
        {m.app_tagline()}
      </p>
    </div>

    <div class="space-y-4">
      <!-- Create Event — hero CTA -->
      <div
        class="animate-pop-in card-pop relative overflow-hidden rounded-3xl bg-primary px-6 py-7 text-primary-foreground"
        style="animation-delay:60ms"
      >
        <div
          class="pointer-events-none absolute -right-6 -top-8 text-[7rem] opacity-15 select-none"
          aria-hidden="true"
        >
          🍲
        </div>
        <h2 class="font-display text-2xl font-semibold tracking-tight">
          {m.home_create_title()}
        </h2>
        <p class="mt-1 text-sm text-primary-foreground/80">
          {m.home_create_description()}
        </p>
        <Button
          href={localizeHref("/create")}
          variant="secondary"
          size="lg"
          class="mt-5 w-full"
        >
          <Plus />
          {m.home_create_action()}
        </Button>
      </div>

      <!-- Join Event -->
      <Card class="animate-pop-in" style="animation-delay:120ms">
        <CardContent class="space-y-3 px-6">
          <div>
            <h2 class="font-display text-xl font-semibold tracking-tight">
              {m.home_join_title()}
            </h2>
            <p class="text-sm text-muted-foreground">
              {m.home_join_description()}
            </p>
          </div>
          <form
            method="POST"
            action="?/join"
            use:enhance
            class="flex flex-col gap-3 sm:flex-row"
          >
            <div class="flex-1 space-y-1">
              <Label for="shareCode" class="sr-only"
                >{m.home_join_code_label()}</Label
              >
              <Input
                id="shareCode"
                name="shareCode"
                bind:value={$form.shareCode}
                placeholder="ABC123"
                class="code-chip h-12 text-center text-lg font-bold uppercase"
                maxlength={8}
              />
            </div>
            <Button
              type="submit"
              size="lg"
              class="h-12 sm:w-auto"
              disabled={!$form.shareCode.trim()}
            >
              {m.home_join_action()}
              <ArrowRight />
            </Button>
          </form>
        </CardContent>
      </Card>

      <!-- My Events -->
      {#if allEvents.length > 0}
        <div
          class="animate-pop-in space-y-2.5 pt-3"
          style="animation-delay:180ms"
        >
          <div class="flex items-center justify-between px-1">
            <h2 class="font-display text-lg font-semibold tracking-tight">
              {m.home_events_title()}
            </h2>
            <Button
              href={localizeHref("/past-sessions")}
              variant="ghost"
              size="sm"
            >
              {m.home_events_history()}
            </Button>
          </div>

          {#each allEvents as event (event.share_code)}
            <a
              href={localizeHref(`/e/${event.share_code}`)}
              class="card-pop group flex items-center gap-3 rounded-2xl bg-card px-4 py-3 transition-transform active:translate-y-0.5"
            >
              <span
                class="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-xl"
                aria-hidden="true"
              >
                {event.hosted ? "🧑‍🍳" : "🍽️"}
              </span>
              <div class="min-w-0 flex-1">
                <div class="truncate font-semibold">{event.name}</div>
                <div class="truncate text-sm text-muted-foreground">
                  {formatDate(event.date)}{#if event.location}&nbsp;·&nbsp;{event.location}{/if}
                </div>
              </div>
              <span
                class="code-chip hidden shrink-0 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground sm:inline"
              >
                {event.share_code}
              </span>
              <ArrowRight
                class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </a>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
