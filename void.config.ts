import { defineConfig } from "void/config";

export default defineConfig({
  cloudflare: {
    name: "popote",
    compatibility_date: "2026-02-24",
    compatibility_flags: ["nodejs_compat"],
    vars: {
      VAPID_PUBLIC_KEY:
        "BB1tnxU58COeKyFCGubAVzmykjZItFzQKFfi-XUOL3RpZuFajz3bqjnF-CjG5lyfsPFD9t57Lf-5XFWOQobkj7Q",
      VAPID_SUBJECT: "mailto:popote@vsantele.dev",
    },
  },
});
