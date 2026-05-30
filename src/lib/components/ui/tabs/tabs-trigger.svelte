<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui"
  import { cn } from "$lib/utils.js"

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: TabsPrimitive.TriggerProps = $props()
</script>

<TabsPrimitive.Trigger
  bind:ref
  data-slot="tabs-trigger"
  class={cn(
    "focus-visible:ring-ring/60 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_2px_0_oklch(0.82_0.06_82)] text-muted-foreground inline-flex h-full items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold tracking-tight whitespace-nowrap transition-[color,background-color,box-shadow] outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
    className,
  )}
  {...restProps}
/>
