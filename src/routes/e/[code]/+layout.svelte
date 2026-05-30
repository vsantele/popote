<script lang="ts">
  import * as m from "$lib/paraglide/messages"
  import { localizeHref } from "$lib/paraglide/runtime"
  import LocaleSwitcher from "$lib/components/locale-switcher.svelte"
  import BrandMark from "$lib/components/brand-mark.svelte"

  let { children } = $props()
</script>

<header
  class="sticky top-0 z-30 w-full border-b border-border-strong/30 bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/65"
>
  <div class="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
    <a
      href={localizeHref("/")}
      class="group flex items-center gap-2 transition-opacity hover:opacity-85"
    >
      <BrandMark size={30} steam={false} />
      <span class="wordmark text-xl">Popote</span>
    </a>
    <LocaleSwitcher />
  </div>
</header>

{@render children()}
