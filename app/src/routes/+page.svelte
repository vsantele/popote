<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "$lib/components/ui/card";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { goto } from "$app/navigation";
  import { superForm } from "sveltekit-superforms";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const { form, errors, enhance, message } = superForm(data.joinForm);

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md space-y-6">
    <div class="flex justify-end">
      <Button
        href="/account"
        variant="ghost"
        size="sm"
        class="text-muted-foreground hover:text-foreground"
      >
        👤 Sync. Appareils
      </Button>
    </div>
    <div class="text-center space-y-2">
      <h1 class="text-4xl font-bold">🍽️ Popote</h1>
      <p class="text-muted-foreground">Organisation de repas collaboratifs</p>
    </div>

    <div class="space-y-4">
      <!-- Create Event -->
      <Card>
        <CardHeader>
          <CardTitle>Créer une soirée</CardTitle>
          <CardDescription
            >Organisez un repas et invitez vos amis</CardDescription
          >
        </CardHeader>
        <CardContent>
          <Button href="/create" class="w-full">Créer une soirée</Button>
        </CardContent>
      </Card>

      <!-- Join Event -->
      <Card>
        <CardHeader>
          <CardTitle>Rejoindre une soirée</CardTitle>
          <CardDescription>Entrez le code partagé par l'hôte</CardDescription>
        </CardHeader>
        <CardContent>
          <form method="POST" action="?/join" use:enhance class="space-y-4">
            <div class="space-y-2">
              <Label for="shareCode">Code de partage</Label>
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
              Rejoindre
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
                <CardTitle>Mes soirées</CardTitle>
                <CardDescription
                  >Retrouvez vos événements en cours</CardDescription
                >
              </div>
              <Button href="/past-sessions" variant="outline" size="sm">
                Historique
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-3">
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
          </CardContent>
        </Card>
      {/if}
    </div>
  </div>
</div>
