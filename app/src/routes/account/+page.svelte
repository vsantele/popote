<script lang="ts">
  import { enhance } from "$app/forms";
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
  import { DEVICE_ID_KEY } from "$lib/utils/device-id";
  import { goto } from "$app/navigation";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();

  $effect(() => {
    if (form?.success && form.newDeviceId) {
      localStorage.setItem(DEVICE_ID_KEY, form.newDeviceId);
      goto("/", { invalidateAll: true });
    }
  });

  let inputCode = $state("");
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md space-y-6">
    <div class="text-center space-y-2">
      <h1 class="text-4xl font-bold">👤 Compte</h1>
      <p class="text-muted-foreground">
        Gérez votre session sur plusieurs appareils
      </p>
    </div>

    <!-- Export Section -->
    <Card>
      <CardHeader>
        <CardTitle>Exporter ma session</CardTitle>
        <CardDescription>
          Générez un code pour synchroniser cet appareil avec un autre.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        {#if form?.code}
          <div
            class="p-6 bg-primary/10 border border-primary/20 rounded-lg text-center space-y-2 animate-in fade-in zoom-in duration-300"
          >
            <div
              class="text-sm font-medium uppercase tracking-wider text-muted-foreground"
            >
              Code de transfert
            </div>
            <div class="text-4xl font-mono font-bold tracking-[0.2em] py-2">
              {form.code}
            </div>
            <div class="text-xs text-muted-foreground">Valable 15 minutes</div>
          </div>
        {:else}
          <form method="POST" action="?/generateCode" use:enhance>
            <Button type="submit" class="w-full">Obtenir un code</Button>
          </form>
        {/if}
      </CardContent>
    </Card>

    <!-- Import Section -->
    <Card>
      <CardHeader>
        <CardTitle>Importer une session</CardTitle>
        <CardDescription>
          Entrez un code généré sur un autre appareil pour récupérer vos
          événements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" action="?/useCode" use:enhance class="space-y-4">
          <div class="space-y-2">
            <Label for="code">Code de transfert</Label>
            <Input
              id="code"
              name="code"
              bind:value={inputCode}
              placeholder="ABC123"
              class="uppercase text-center text-lg font-mono tracking-widest"
              maxlength={6}
              required
            />
          </div>

          {#if form?.error && !form.success}
            <p class="text-sm text-destructive">{form.error}</p>
          {/if}

          <Button
            type="submit"
            class="w-full"
            variant="outline"
            disabled={inputCode.length < 6}
          >
            Synchroniser cet appareil
          </Button>
        </form>
      </CardContent>
    </Card>

    <div class="text-center">
      <Button href="/" variant="ghost" size="sm">Retour à l'accueil</Button>
    </div>

    <!-- Advanced: Manual ID -->
    <div class="pt-8 text-center">
      <details class="text-xs text-muted-foreground">
        <summary class="cursor-pointer hover:underline"
          >Informations avancées</summary
        >
        <div class="mt-2 p-2 bg-muted rounded break-all font-mono">
          ID Personnel : {data.deviceId || "Non généré"}
        </div>
      </details>
    </div>
  </div>
</div>
