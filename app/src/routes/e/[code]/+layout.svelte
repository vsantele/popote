<script lang="ts">
  let { children } = $props();
</script>

<header
  class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60"
>
  <div class="container flex h-14 items-center px-4 mx-auto">
    <a
      href="/"
      class="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity"
    >
      🍽️ Popote
    </a>
  </div>
</header>

{@render children()}
