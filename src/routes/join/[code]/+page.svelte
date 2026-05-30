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
  import {
    ToggleGroup,
    ToggleGroupItem,
  } from "$lib/components/ui/toggle-group"
  import { superForm } from "sveltekit-superforms/client"
  import * as m from "$lib/paraglide/messages"
  import type { PageProps } from "./$types"
  import { localizeHref } from "$lib/paraglide/runtime"
  import BrandMark from "$lib/components/brand-mark.svelte"

  let { data }: PageProps = $props()

  // svelte-ignore state_referenced_locally
  const { form, errors, enhance, delayed } = superForm(data.form, {
    resetForm: false,
  })
</script>

<div class="flex min-h-screen flex-col items-center justify-center p-4">
  <div class="w-full max-w-md">
    <div class="animate-pop-in mb-5 flex flex-col items-center gap-1 text-center">
      <BrandMark size={56} />
      <span class="wordmark text-2xl">Popote</span>
    </div>
    <Card class="animate-pop-in" style="animation-delay:60ms">
      <CardHeader>
        <CardTitle>{m.join_title({ name: data.event.name })}</CardTitle>
        <CardDescription>{m.join_description()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form method="POST" use:enhance class="space-y-4">
          <div class="space-y-2">
            <Label for="name">{m.join_field_name_label()}</Label>
            <Input
              id="name"
              name="name"
              bind:value={$form.name}
              placeholder={m.join_field_name_placeholder()}
              required
              autofocus
              aria-invalid={$errors.name ? "true" : undefined}
            />
            {#if $errors.name}
              <p class="text-sm text-destructive">{$errors.name}</p>
            {/if}
          </div>

          <div class="space-y-2">
            <Label>{m.join_rsvp_label()}</Label>
            <input type="hidden" name="rsvp" value={$form.rsvp} />
            <ToggleGroup
              value={$form.rsvp}
              onValueChange={(value) => {
                if (value) $form.rsvp = value as "going" | "maybe" | "not"
              }}
              type="single"
              class="w-full"
            >
              <ToggleGroupItem value="going" class="flex-1">
                {m.join_rsvp_going()}
              </ToggleGroupItem>
              <ToggleGroupItem value="maybe" class="flex-1">
                {m.join_rsvp_maybe()}
              </ToggleGroupItem>
              <ToggleGroupItem value="not" class="flex-1">
                {m.join_rsvp_not()}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div class="space-y-2">
            <Label for="extraGuests">{m.join_rsvp_extra_label()}</Label>
            <Input
              id="extraGuests"
              name="extraGuests"
              type="number"
              min="0"
              max="50"
              bind:value={$form.extraGuests}
              disabled={$form.rsvp === "not"}
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
              {$delayed ? m.join_submitting() : m.join_submit()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</div>
