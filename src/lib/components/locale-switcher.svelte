<script lang="ts">
  import { page } from "$app/state"
  import { Button } from "$lib/components/ui/button"
  import { getLocale, locales, localizeHref } from "$lib/paraglide/runtime"
  import * as m from "$lib/paraglide/messages"
  import { resolve } from "$app/paths"

  const labels: Record<string, string> = {
    fr: m.locale_label_fr(),
    en: m.locale_label_en(),
  }

  const active = $derived(getLocale())
</script>

<div class="flex gap-1">
  {#each locales as locale (locale)}
    <Button
      variant={active === locale ? "secondary" : "ghost"}
      size="sm"
      class="h-8 px-2 text-xs"
      href={resolve(localizeHref(page.url.pathname, { locale }))}
      data-sveltekit-reload
    >
      {labels[locale] ?? locale.toUpperCase()}
    </Button>
  {/each}
</div>
