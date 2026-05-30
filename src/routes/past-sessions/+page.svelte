<script lang="ts">
  import { Button } from "$lib/components/ui/button"
  import { Card, CardContent } from "$lib/components/ui/card"
  import * as m from "$lib/paraglide/messages"
  import { getLocale, localizeHref } from "$lib/paraglide/runtime"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString(getLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }
</script>

<div class="min-h-screen p-4">
  <div class="max-w-md mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="font-display text-2xl font-semibold tracking-tight">{m.past_title()}</h1>
        <p class="text-sm text-muted-foreground">{m.past_description()}</p>
      </div>
      <Button href={localizeHref("/")} variant="outline" size="sm"
        >{m.nav_back()}</Button
      >
    </div>

    {#if data.hosted.length === 0 && data.joined.length === 0}
      <Card>
        <CardContent class="card-pop flex flex-col items-center gap-3 py-14 text-center">
          <span class="text-5xl" aria-hidden="true">{m.past_empty_emoji()}</span>
          <p class="font-display text-lg font-semibold">{m.past_empty_heading()}</p>
          <p class="text-sm text-muted-foreground">{m.past_empty_subtext()}</p>
          <Button href={localizeHref("/create")} variant="default" size="sm" class="mt-1">
            {m.past_empty_cta()}
          </Button>
        </CardContent>
      </Card>
    {:else}
      <div class="space-y-4">
        {#if data.hosted.length > 0}
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-muted-foreground">
              {m.home_events_hosted_heading()}
            </h3>
            {#each data.hosted as event}
              <a
                href={localizeHref(`/e/${event.share_code}`)}
                class="card-pop block rounded-2xl bg-card px-4 py-3 opacity-90 transition-all hover:opacity-100 active:translate-y-0.5"
              >
                <div class="font-semibold">{event.name}</div>
                <div class="text-sm text-muted-foreground">
                  {formatDate(event.date)}
                  {#if event.location}
                    · {event.location}
                  {/if}
                </div>
                <div class="code-chip text-muted-foreground mt-1 text-xs">
                  {m.event_code_label({ code: event.share_code })}
                </div>
              </a>
            {/each}
          </div>
        {/if}

        {#if data.joined.length > 0}
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-muted-foreground">
              {m.home_events_joined_heading()}
            </h3>
            {#each data.joined as event}
              <a
                href={localizeHref(`/e/${event.share_code}`)}
                class="card-pop block rounded-2xl bg-card px-4 py-3 opacity-90 transition-all hover:opacity-100 active:translate-y-0.5"
              >
                <div class="font-semibold">{event.name}</div>
                <div class="text-sm text-muted-foreground">
                  {formatDate(event.date)}
                  {#if event.location}
                    · {event.location}
                  {/if}
                </div>
                <div class="code-chip text-muted-foreground mt-1 text-xs">
                  {m.event_code_label({ code: event.share_code })}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
