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
  import * as m from "$lib/paraglide/messages"
  import { localizeHref } from "$lib/paraglide/runtime"
  import type { PageProps } from "./$types"

  let { data }: PageProps = $props()

  const { form, errors, enhance, delayed } = superForm(data.form, {
    resetForm: false,
  })
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card>
      <CardHeader>
        <CardTitle>{m.home_create_title()}</CardTitle>
        <CardDescription>{m.create_card_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" use:enhance class="space-y-4">
          <div class="space-y-2">
            <Label for="host_name">{m.create_field_host_name_label()}</Label>
            <Input
              id="host_name"
              name="host_name"
              bind:value={$form.host_name}
              placeholder={m.create_field_host_name_placeholder()}
              required
              aria-invalid={$errors.host_name ? "true" : undefined}
            />
            {#if $errors.host_name}
              <p class="text-sm text-destructive">{$errors.host_name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="name">{m.create_field_event_name_label()}</Label>
            <Input
              id="name"
              name="name"
              bind:value={$form.name}
              placeholder={m.create_field_event_name_placeholder()}
              required
              aria-invalid={$errors.name ? "true" : undefined}
            />
            {#if $errors.name}
              <p class="text-sm text-destructive">{$errors.name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label for="date">{m.create_field_date_label()}</Label>
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
            <Label for="location">{m.create_field_location_label()}</Label>
            <Input
              id="location"
              name="location"
              bind:value={$form.location}
              placeholder={m.create_field_location_placeholder()}
            />
          </div>

          <div class="space-y-2">
            <Label for="description">{m.create_field_description_label()}</Label
            >
            <Input
              id="description"
              name="description"
              bind:value={$form.description}
              placeholder={m.create_field_description_placeholder()}
            />
          </div>

          <div class="flex gap-2">
            <Button
              type="button"
              variant="outline"
              href={localizeHref("/")}
              class="flex-1"
            >
              {m.common_cancel()}
            </Button>
            <Button type="submit" class="flex-1" disabled={$delayed}>
              {$delayed ? m.create_submitting() : m.create_submit()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
