<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { setLocale, getLocale, locales } from "$lib/paraglide/runtime";
  import * as m from "$lib/paraglide/messages";

  const labels: Record<string, string> = {
    fr: m.locale_label_fr(),
    en: m.locale_label_en(),
  };

  const active = $derived(getLocale());
</script>

<div class="flex gap-1">
  {#each locales as locale (locale)}
    <Button
      variant={active === locale ? "secondary" : "ghost"}
      size="sm"
      class="h-8 px-2 text-xs"
      onclick={() => setLocale(locale)}
    >
      {labels[locale] ?? locale.toUpperCase()}
    </Button>
  {/each}
</div>
