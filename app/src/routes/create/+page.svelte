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
  import { superForm } from "sveltekit-superforms/client"
  import { setUserName } from "$lib/utils/device-id"

  let { data } = $props()

  const { form, errors, enhance, delayed } = superForm(data.form, {
    resetForm: false,
    onSubmit: () => {
      // Save host name to localStorage when submitting
      if ($form.host_name) {
        setUserName($form.host_name)
      }
    },
  })
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card>
      <CardHeader>
        <CardTitle>Créer une soirée</CardTitle>
        <CardDescription>Organisez votre repas collaboratif</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" use:enhance class="space-y-4">
          <div class="space-y-2">
            <Label for="host_name">Votre nom *</Label>
            <Input
              id="host_name"
              name="host_name"
              bind:value={$form.host_name}
              placeholder="Votre prénom"
              required
              aria-invalid={$errors.host_name ? "true" : undefined}
            />
            {#if $errors.host_name}
              <p class="text-sm text-destructive">{$errors.host_name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="name">Nom de la soirée *</Label>
            <Input
              id="name"
              name="name"
              bind:value={$form.name}
              placeholder="Barbecue chez Nico"
              required
              aria-invalid={$errors.name ? "true" : undefined}
            />
            {#if $errors.name}
              <p class="text-sm text-destructive">{$errors.name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="date">Date *</Label>
            <Input
              id="date"
              name="date"
              type="datetime-local"
              bind:value={$form.date}
              required
              aria-invalid={$errors.date ? "true" : undefined}
            />
            {#if $errors.date}
              <p class="text-sm text-destructive">{$errors.date}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="location">Lieu</Label>
            <Input
              id="location"
              name="location"
              bind:value={$form.location}
              placeholder="12 rue de la Paix, Paris"
            />
          </div>

          <div class="space-y-2">
            <Label for="description">Description</Label>
            <Input
              id="description"
              name="description"
              bind:value={$form.description}
              placeholder="Ramenez vos spécialités !"
            />
          </div>

          <div class="flex gap-2">
            <Button type="button" variant="outline" href="/" class="flex-1">
              Annuler
            </Button>
            <Button type="submit" class="flex-1" disabled={$delayed}>
              {$delayed ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
