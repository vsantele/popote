# Kane — History

## Project Context

- **Project:** popote
- **Stack:** Flutter (mobile), PocketBase (backend)
- **Description:** Application d'organisation de repas collaboratifs type "auberge espagnole" — zéro friction, mobile-first, temps réel
- **User:** Victor
- **Created:** 2026-03-22

**My focus:** PocketBase, data models, realtime, API

**Collections:**
- `events`: id, name, date, location, description, host_name, host_device_id, share_code, created
- `participants`: id, event (FK), name, device_id, is_host, created
- `items`: id, event (FK), participant (FK), name, category (select), quantity, created

**Categories (select):** apero, entree, plat, dessert, boissons, jeux, autre

## Learnings

