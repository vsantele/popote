<script lang="ts">
  import { getErrorPageVariant } from "$lib/error-page";
  import * as m from "$lib/paraglide/messages";
  import { localizeHref } from "$lib/paraglide/runtime";

  let { status, error } = $props<{
    status: number;
    error: App.Error & { message?: string };
  }>();

  const variant = $derived(getErrorPageVariant(status));
</script>

<svelte:head>
  <title>
    {variant === "not-found" ? m.not_found_title() : m.server_error_title()} · {m.app_name()}
  </title>
</svelte:head>

<div
  class="min-h-screen bg-linear-to-br from-background via-background to-muted/40 px-4 py-10 sm:px-6 lg:px-8"
>
  <div
    class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center"
  >
    <div class="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <section
        class="relative overflow-hidden rounded-3xl border bg-card/95 p-8 shadow-xl shadow-primary/5 backdrop-blur sm:p-10"
      >
        <div
          class="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        ></div>
        <div
          class="absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-secondary/40 blur-3xl"
        ></div>

        <div class="relative space-y-6">
          <div
            class="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
          >
            {variant === "not-found"
              ? m.not_found_badge()
              : m.server_error_badge()}
          </div>

          <div class="space-y-3">
            <p
              class="text-6xl font-semibold tracking-tight text-foreground sm:text-7xl"
            >
              {status}
            </p>
            <h1
              class="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              {variant === "not-found"
                ? m.not_found_title()
                : m.server_error_title()}
            </h1>
            <p
              class="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg"
            >
              {variant === "not-found"
                ? m.not_found_description()
                : m.server_error_description()}
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <a
              href={localizeHref("/")}
              class="inline-flex min-w-36 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {variant === "not-found"
                ? m.not_found_home()
                : m.server_error_home()}
            </a>
          </div>

          {#if error?.message}
            <p class="text-sm text-muted-foreground">
              {error.message}
            </p>
          {/if}
        </div>
      </section>

      <aside
        class="flex flex-col justify-between rounded-3xl border bg-muted/50 p-8 sm:p-10"
      >
        <div class="space-y-4">
          <div
            class="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-background text-2xl shadow-sm"
          >
            🍽️
          </div>
          <div class="space-y-2">
            <h2 class="text-xl font-semibold">{m.app_name()}</h2>
            <p class="text-sm leading-6 text-muted-foreground">
              {variant === "not-found"
                ? m.not_found_hint()
                : m.server_error_hint()}
            </p>
          </div>
        </div>

        <div
          class="mt-8 rounded-2xl border bg-background/80 p-4 text-sm text-muted-foreground shadow-sm"
        >
          <p class="font-medium text-foreground">{m.app_tagline()}</p>
          <p class="mt-2">
            {variant === "not-found"
              ? m.not_found_description()
              : m.server_error_description()}
          </p>
        </div>
      </aside>
    </div>
  </div>
</div>
