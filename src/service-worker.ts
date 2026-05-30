/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from "$service-worker";

const sw = self as unknown as ServiceWorkerGlobalScope;

const CACHE_NAME = `popote-cache-${version}`;
const ASSETS = [...build, ...files];

// Install - cache static assets
sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)),
  );
});

// Activate - cleanup old caches
sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

// Push - show the notification delivered by the server (web push, issue #7).
// The payload is the JSON produced by buildReminderPayload on the server.
sw.addEventListener("push", (event) => {
  let data: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
  } = {};
  try {
    if (event.data) data = event.data.json();
  } catch {
    data = { body: event.data?.text() };
  }

  const title = data.title ?? "🍽️ La Popote";
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    // Coalesce repeated reminders for the same event into one notification.
    tag: data.tag,
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

// Notification click - focus an existing tab for the target URL or open one.
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          // If a tab is already on the target path, just focus it.
          if (client.url.includes(targetUrl) && "focus" in client) {
            return client.focus();
          }
        }
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});

// Fetch strategy:
// - Network first for API calls (real-time data)
// - Cache first for static assets
sw.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network first for API calls
  if (url.pathname.startsWith("/api/") || url.host !== sw.location.host) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful GET requests
          if (request.method === "GET" && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cached) => {
            if (cached) {
              return cached;
            }
            // Return offline page for navigation requests
            if (request.mode === "navigate") {
              return caches.match("/");
            }
            return new Response("Network error", { status: 503 });
          });
        }),
    );
  } else {
    // Cache first for static assets
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached;
        }
        return fetch(request).then((response) => {
          // Cache the new resource
          if (request.method === "GET" && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      }),
    );
  }
});
