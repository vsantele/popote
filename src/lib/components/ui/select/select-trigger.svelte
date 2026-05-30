<script lang="ts">
  import { Select as SelectPrimitive } from "bits-ui";
  import { cn, type WithoutChild } from "$lib/utils.js";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";

  let {
    ref = $bindable(null),
    class: className,
    children,
    size = "default",
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> & {
    size?: "sm" | "default";
  } = $props();
</script>

<SelectPrimitive.Trigger
  bind:ref
  data-slot="select-trigger"
  data-size={size}
  class={cn(
    "border-[1.5px] border-border-strong/70 bg-card/80 data-placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive gap-1.5 rounded-xl py-2 pr-3 pl-3.5 text-sm transition-[color,box-shadow,border-color] select-none focus-visible:ring-4 aria-invalid:ring-4 data-[size=default]:h-11 data-[size=sm]:h-9 *:data-[slot=select-value]:flex *:data-[slot=select-value]:gap-1.5 [&_svg:not([class*='size-'])]:size-4 flex w-full items-center justify-between whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
    className,
  )}
  {...restProps}
>
  {@render children?.()}
  <ChevronDownIcon class="text-muted-foreground size-4 pointer-events-none" />
</SelectPrimitive.Trigger>
