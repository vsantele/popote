<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui"
  import { cn } from "$lib/utils.js"

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: TabsPrimitive.ListProps = $props()
</script>

<TabsPrimitive.List
  bind:ref
  data-slot="tabs-list"
  class={cn(
    "border-border-strong/60 bg-secondary/50 grid h-12 w-full grid-cols-2 items-center gap-1 rounded-full border-[1.5px] p-1",
    className,
  )}
  {...restProps}
/>
