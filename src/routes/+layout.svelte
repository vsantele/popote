<script lang="ts">
  import "./layout.css";
  import favicon from "#lib/assets/favicon.svg";
  import { measurePageLoad } from "#lib/utils/logger.js";
  import { onMount } from "svelte";
  import * as m from "#lib/paraglide/messages.js";

  let { children } = $props();

  onMount(() => {
    measurePageLoad();

    // Register service worker (if available)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js", { type: "module" })
        .then(() => console.log("Service worker registered"))
        .catch((err) =>
          console.error("Service worker registration failed:", err),
        );
    }
  });
</script>

<svelte:head>
  <title>{m.app_name()}</title>
  <link rel="icon" type="image/svg+xml" href={favicon} />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/manifest.json" />
  <meta name="theme-color" content="#FF6B35" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Popote" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, viewport-fit=cover"
  />
</svelte:head>

{@render children()}
