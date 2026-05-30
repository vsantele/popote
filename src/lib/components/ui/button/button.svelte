<script lang="ts" module>
  import { cn, type WithElementRef } from "$lib/utils.js";
  import type {
    HTMLAnchorAttributes,
    HTMLButtonAttributes,
  } from "svelte/elements";
  import { type VariantProps, tv } from "tailwind-variants";

  export const buttonVariants = tv({
    base: "focus-visible:ring-ring/60 aria-invalid:ring-destructive/30 aria-invalid:border-destructive rounded-full border border-transparent bg-clip-padding font-semibold tracking-tight focus-visible:ring-4 active:translate-y-0.5 active:shadow-none aria-invalid:ring-4 [&_svg:not([class*='size-'])]:size-4 group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap transition-[transform,box-shadow,background-color,color] duration-150 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_3px_0_oklch(0.45_0.16_34),0_8px_20px_-8px_oklch(0.5_0.18_34/0.6)] hover:brightness-105 active:shadow-[0_1px_0_oklch(0.45_0.16_34)]",
        outline:
          "border-[1.5px] border-border-strong bg-card text-foreground hover:bg-secondary/60 hover:border-foreground/40 aria-expanded:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_2px_0_oklch(0.82_0.06_82)] hover:brightness-[1.03] active:shadow-none aria-expanded:bg-secondary",
        ghost:
          "hover:bg-secondary/70 hover:text-foreground aria-expanded:bg-secondary aria-expanded:text-foreground",
        destructive:
          "bg-destructive/12 hover:bg-destructive/20 focus-visible:ring-destructive/30 text-destructive border-destructive/20",
        link: "text-primary underline-offset-4 hover:underline rounded-none",
      },
      size: {
        default:
          "h-11 gap-2 px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 px-3.5 text-[0.82rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-13 gap-2 px-7 text-base has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-9",
        "icon-lg": "size-13",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  });

  export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
  export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

  export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
    WithElementRef<HTMLAnchorAttributes> & {
      variant?: ButtonVariant;
      size?: ButtonSize;
    };
</script>

<script lang="ts">
  let {
    class: className,
    variant = "default",
    size = "default",
    ref = $bindable(null),
    href = undefined,
    type = "button",
    disabled,
    children,
    ...restProps
  }: ButtonProps = $props();
</script>

{#if href}
  <a
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    href={disabled ? undefined : href}
    aria-disabled={disabled}
    role={disabled ? "link" : undefined}
    tabindex={disabled ? -1 : undefined}
    {...restProps}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={ref}
    data-slot="button"
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    {disabled}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
