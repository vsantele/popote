import { defineConfig } from "void/config";

export default defineConfig({
  cloudflare: {
    name: "popote",
    compatibility_date: "2026-02-24",
    compatibility_flags: ["nodejs_compat"],
    // Traffic attachment is declared explicitly so `void deploy` can republish it.
    // Without these fields Void refuses to deploy over the dashboard-managed state
    // of the existing Worker ("traffic-preservation-unavailable").
    // The account has no zones and no Custom Domains, so workers.dev is the app URL.
    routes: [],
    workers_dev: true,
    preview_urls: true,
    vars: {
      VAPID_PUBLIC_KEY:
        "BB1tnxU58COeKyFCGubAVzmykjZItFzQKFfi-XUOL3RpZuFajz3bqjnF-CjG5lyfsPFD9t57Lf-5XFWOQobkj7Q",
      VAPID_SUBJECT: "mailto:popote@vsantele.dev",
    },
  },
});
