<script lang="ts">
  import * as m from "$lib/paraglide/messages"
  import { localizeHref } from "$lib/paraglide/runtime"
  import LocaleSwitcher from "$lib/components/locale-switcher.svelte"

  let { children } = $props()
</script>

<header
  class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
>
  <div class="container flex h-14 items-center justify-between px-4 mx-auto">
    <a
      href={localizeHref("/")}
      class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
    >
      {m.app_name()}
    </a>
    <LocaleSwitcher />
  </div>
</header>

{@render children()}
