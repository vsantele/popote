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
  import { superForm } from "sveltekit-superforms/client";
  import { setUserName } from "$lib/utils/device-id";

  let { data } = $props();

  const { form, errors, enhance, delayed } = superForm(data.form, {
    resetForm: false,
    onSubmit: () => {
      // Save user name to localStorage when submitting
      if ($form.name) {
        setUserName($form.name);
      }
    },
  });
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card>
      <CardHeader>
        <CardTitle>Rejoindre "{data.event.name}"</CardTitle>
        <CardDescription>
          Entrez votre nom pour participer à cet événement
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" use:enhance class="space-y-4">
          <div class="space-y-2">
            <Label for="name">Votre nom *</Label>
            <Input
              id="name"
              name="name"
              bind:value={$form.name}
              placeholder="Votre prénom"
              required
              autofocus
              aria-invalid={$errors.name ? "true" : undefined}
            />
            {#if $errors.name}
              <p class="text-sm text-destructive">{$errors.name}</p>
            {/if}
          </div>

          <div class="flex gap-2">
            <Button type="button" variant="outline" href="/" class="flex-1">
              Annuler
            </Button>
            <Button type="submit" class="flex-1" disabled={$delayed}>
              {$delayed ? "Connexion..." : "Rejoindre"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
