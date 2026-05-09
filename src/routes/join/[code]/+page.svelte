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
  import type { PageProps } from "./$types"
  import { localizeHref } from "$lib/paraglide/runtime"

  let { data }: PageProps = $props()

  // svelte-ignore state_referenced_locally
  const { form, errors, enhance, delayed } = superForm(data.form, {
    resetForm: false,
  })
</script>

<div class="min-h-screen flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card>
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
