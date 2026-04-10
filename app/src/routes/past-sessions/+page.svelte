<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
</script>

<div class="min-h-screen p-4">
  <div class="max-w-md mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Historique des soirées</h1>
        <p class="text-sm text-muted-foreground">Vos événements passés</p>
      </div>
      <Button href="/" variant="outline" size="sm">Retour</Button>
    </div>

    {#if data.hosted.length === 0 && data.joined.length === 0}
      <Card>
        <CardContent class="py-12 text-center">
          <p class="text-muted-foreground">
            Aucune soirée passée pour le moment.
          </p>
        </CardContent>
      </Card>
    {:else}
      <div class="space-y-4">
        {#if data.hosted.length > 0}
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-muted-foreground">
              Créées par moi
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
                  Code: {event.share_code}
                </div>
              </a>
            {/each}
          </div>
        {/if}

        {#if data.joined.length > 0}
          <div class="space-y-2">
            <h3 class="text-sm font-medium text-muted-foreground">
              Rejoint en tant qu'invité
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
                  Code: {event.share_code}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
