<script lang="ts">
  import { cn } from "$lib/utils.js"

  let {
    size = 64,
    steam = true,
    class: className,
  }: { size?: number; steam?: boolean; class?: string } = $props()
</script>

<svg
  class={cn("popote-pot", className)}
  width={size}
  height={size}
  viewBox="0 0 80 80"
  fill="none"
  role="img"
  aria-label="Popote"
  xmlns="http://www.w3.org/2000/svg"
>
  {#if steam}
    <g class="steam" stroke-linecap="round" fill="none" stroke-width="3">
      <path class="wisp wisp-1" d="M30 24 q-4 -5 0 -10 q4 -5 0 -10" />
      <path class="wisp wisp-2" d="M40 24 q-4 -6 0 -12 q4 -6 0 -13" />
      <path class="wisp wisp-3" d="M50 24 q-4 -5 0 -10 q4 -5 0 -10" />
    </g>
  {/if}

  <!-- ear handles -->
  <path
    class="rim"
    d="M16 40 q-8 0 -8 6 q0 6 8 6"
    fill="none"
    stroke-width="5"
  />
  <path
    class="rim"
    d="M64 40 q8 0 8 6 q0 6 -8 6"
    fill="none"
    stroke-width="5"
  />

  <!-- pot body -->
  <path
    class="body"
    d="M15 36 H65 L62 58 Q61 65 53 65 H27 Q19 65 18 58 Z"
  />
  <!-- glossy highlight -->
  <path
    class="shine"
    d="M24 41 Q26 53 30 60"
    fill="none"
    stroke-width="3.5"
    stroke-linecap="round"
  />

  <!-- lid -->
  <ellipse class="lid" cx="40" cy="34" rx="27" ry="7.5" />
  <rect class="rim" x="38.5" y="25" width="3" height="6" rx="1.5" />
  <circle class="knob" cx="40" cy="24" r="4.5" />
</svg>

<style>
  .body {
    fill: var(--primary);
  }
  .lid {
    fill: color-mix(in oklab, var(--primary), black 16%);
  }
  .knob {
    fill: color-mix(in oklab, var(--primary), black 24%);
  }
  .rim {
    stroke: color-mix(in oklab, var(--primary), black 24%);
  }
  .shine {
    stroke: color-mix(in oklab, white 70%, var(--primary));
    opacity: 0.7;
  }
  .wisp {
    stroke: color-mix(in oklab, var(--primary), white 35%);
    transform-box: fill-box;
    transform-origin: bottom center;
    animation: popote-steam 2.6s ease-in-out infinite;
  }
  .wisp-1 {
    animation-delay: 0s;
  }
  .wisp-2 {
    animation-delay: 0.5s;
  }
  .wisp-3 {
    animation-delay: 1s;
  }
  @media (prefers-reduced-motion: reduce) {
    .wisp {
      animation: none;
      opacity: 0.5;
    }
  }
</style>
