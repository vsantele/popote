<script lang="ts">
  import { Button } from "$lib/components/ui/button"
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card"
  import { Input } from "$lib/components/ui/input"
  import { Label } from "$lib/components/ui/label"
  import { goto } from "$app/navigation"
  import { superForm } from "sveltekit-superforms"
  import * as m from "$lib/paraglide/messages"
  import { getLocale } from "$lib/paraglide/runtime"
  import LocaleSwitcher from "$lib/components/locale-switcher.svelte"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  const { form, errors, enhance, message } = superForm(data.joinForm)

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString(getLocale(), {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md space-y-6">
    <div class="flex items-center justify-end gap-2">
      <LocaleSwitcher />
      <Button
        href="/account"
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-foreground"
      >
        {m.nav_account()}
      </Button>
    </div>
    <div class="text-center space-y-2">
      <h1 class="text-4xl font-bold">{m.app_name()}</h1>
      <p class="text-muted-foreground">{m.app_tagline()}</p>
    </div>

    <div class="space-y-4">
      <!-- Create Event -->
      <Card>
        <CardHeader>
          <CardTitle>{m.home_create_title()}</CardTitle>
          <CardDescription>{m.home_create_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button href="/create" class="w-full">{m.home_create_action()}</Button
          >
        </CardContent>
      </Card>

      <!-- Join Event -->
      <Card>
        <CardHeader>
          <CardTitle>{m.home_join_title()}</CardTitle>
          <CardDescription>{m.home_join_description()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="POST" action="?/join" use:enhance class="space-y-4">
            <div class="space-y-2">
              <Label for="shareCode">{m.home_join_code_label()}</Label>
              <Input
                id="shareCode"
                name="shareCode"
                bind:value={$form.shareCode}
                placeholder="ABC123"
                class="uppercase"
                maxlength={8}
              />
            </div>
            <Button
              type="submit"
              class="w-full"
              disabled={!$form.shareCode.trim()}
            >
              {m.home_join_action()}
            </Button>
          </form>
        </CardContent>
      </Card>

      <!-- My Events -->
      {#if data.hosted.length > 0 || data.joined.length > 0}
        <Card>
          <CardHeader>
            <div class="flex items-center justify-between">
              <div>
                <CardTitle>{m.home_events_title()}</CardTitle>
                <CardDescription>{m.home_events_description()}</CardDescription>
              </div>
              <Button href="/past-sessions" variant="outline" size="sm">
                {m.home_events_history()}
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
            {#if data.hosted.length > 0}
              <div class="space-y-2">
                <h3 class="text-sm font-medium text-muted-foreground">
                  {m.home_events_hosted_heading()}
                </h3>
                {#each data.hosted as event}
                  <a
                    href="/e/{event.share_code}"
                    class="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div class="font-medium">{event.name}</div>
                    <div class="text-sm text-muted-foreground">
                      {formatDate(event.date)}
                      {#if event.location}
                        · {event.location}
                      {/if}
                    </div>
                    <div class="text-xs text-muted-foreground mt-1">
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
                    href="/e/{event.share_code}"
                    class="block p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div class="font-medium">{event.name}</div>
                    <div class="text-sm text-muted-foreground">
                      {formatDate(event.date)}
                      {#if event.location}
                        · {event.location}
                      {/if}
                    </div>
                    <div class="text-xs text-muted-foreground mt-1">
                      {m.event_code_label({ code: event.share_code })}
                    </div>
                  </a>
                {/each}
              </div>
            {/if}
          </CardContent>
        </Card>
      {/if}
    </div>
  </div>
</div>
