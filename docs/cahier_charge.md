# Cahier des charges — Popote

**Application d'organisation de repas/soirées collaboratifs**
*La popote entre potes, bien organisée.*

---

## 1. Vision produit

Permettre à un hôte d'organiser un repas ou une soirée "à la bonne franquette" où chaque invité ramène quelque chose, avec juste assez d'organisation pour éviter les doublons et les oublis — sans usine à gaz.

**Mots-clés UX :** simple, rapide, zéro friction, mobile-first.

---

## 2. Principes directeurs

- **Zéro compte obligatoire** pour les invités — on rejoint via un lien, on met son prénom, c'est parti.
- **Création en 30 secondes** — l'hôte donne un nom, une date, un lieu (optionnel) et c'est tout.
- **Une seule vue principale** — la liste de qui ramène quoi, organisable par personne ou par catégorie.
- **Pas de notifications abusives** — l'app reste légère et respectueuse.

---

## 3. Acteurs

| Rôle | Description |
|------|-------------|
| **Hôte** | Crée l'événement, partage le lien, peut modérer (supprimer/éditer des items). |
| **Invité** | Rejoint via le lien, renseigne son prénom, ajoute ce qu'il ramène. |

---

## 4. Parcours utilisateurs

### 4.1 Hôte — Créer un événement

1. Ouvre l'app → écran d'accueil avec bouton "Créer une soirée"
2. Remplit le formulaire minimal :
   - **Nom de la soirée** (obligatoire) — ex. "Barbecue chez Nico"
   - **Date & heure** (obligatoire)
   - **Lieu / adresse** (optionnel)
   - **Note / description** (optionnel) — ex. "Ramenez vos spécialités !"
3. Valide → la soirée est créée
4. Écran de la soirée avec un **bouton de partage** (lien unique + deep link)
5. L'hôte peut lui aussi ajouter ce qu'il ramène

### 4.2 Invité — Rejoindre et contribuer

1. Reçoit un lien (SMS, WhatsApp, Messenger…)
2. Ouvre le lien → arrive sur la soirée (dans l'app si installée, sinon web fallback ou store redirect)
3. Renseigne son **prénom** (stocké localement pour les prochaines fois)
4. Voit la liste actuelle de qui ramène quoi
5. Appuie sur "+" pour ajouter un item :
   - **Quoi** (texte libre) — ex. "Tiramisu maison"
   - **Catégorie** (sélection) — voir §5
   - **Quantité / précision** (optionnel) — ex. "pour 6 personnes"
6. Peut modifier ou supprimer ses propres items

### 4.3 Consultation

- **Vue par catégorie** (par défaut) : sections dépliables (Apéro, Entrée, Plat…) avec les items et le nom de la personne
- **Vue par personne** : chaque participant avec la liste de ce qu'il ramène

---

## 5. Catégories

Liste fixe (v1), non personnalisable pour garder la simplicité :

| Catégorie | Icône suggérée |
|-----------|---------------|
| 🥂 Apéro | Chips, dips, planches… |
| 🥗 Entrée | Salades, soupes… |
| 🍖 Plat | Plat principal, accompagnements… |
| 🍰 Dessert | Gâteaux, fruits… |
| 🍷 Boissons | Vin, bière, soft, eau… |
| 🎲 Jeux / Activités | Jeux de société, musique… |
| 📦 Autre | Vaisselle jetable, serviettes, glacière… |

---

## 6. Écrans principaux

### E1 — Accueil
- Liste des soirées passées/à venir de l'utilisateur
- Bouton "Créer une soirée"
- Pas de login — identification locale (prénom + ID device)

### E2 — Création de soirée
- Formulaire minimal (cf. §4.1)

### E3 — Vue soirée (écran central)
- Header : nom, date, lieu, description
- Toggle : vue "Par catégorie" / "Par personne"
- Liste des contributions
- Bouton flottant "+" pour ajouter un item
- Bouton partage (share sheet natif)

### E4 — Ajout d'item
- Bottom sheet ou modale simple
- Champ texte + sélecteur de catégorie + champ quantité optionnel

### E5 — Détail personne (optionnel v1)
- Accessible depuis la vue par personne
- Liste de tout ce que la personne ramène

---

## 7. Stack technique

### Frontend
- **Flutter** (iOS + Android, potentiellement web)
- State management léger : `Riverpod` ou `Provider`
- Thème Material 3 avec personnalisation minimale

### Backend
- **PocketBase** (self-hosted ou PocketHost.io)
  - Base SQLite embarquée — parfait pour un MVP
  - API REST auto-générée
  - Realtime via SSE (les invités voient les ajouts en temps réel)
  - Auth anonyme ou par token simple (pas besoin de comptes)

### Partage
- Lien unique par soirée : `https://app.popote.io/s/{eventId}`
- Intégration share sheet natif (Flutter `share_plus`)
- Deep linking (Firebase Dynamic Links, ou app links / universal links)

---

## 8. Modèle de données (PocketBase)

### Collection `events`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | string (auto) | PK |
| `name` | string | Nom de la soirée |
| `date` | datetime | Date et heure |
| `location` | string | Optionnel |
| `description` | text | Optionnel |
| `host_name` | string | Prénom de l'hôte |
| `host_device_id` | string | Identifiant local |
| `share_code` | string (unique) | Code court pour le lien de partage |
| `created` | datetime (auto) | |

### Collection `participants`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | string (auto) | PK |
| `event` | relation → events | FK |
| `name` | string | Prénom |
| `device_id` | string | Pour retrouver "ses" données |
| `is_host` | bool | |
| `created` | datetime (auto) | |

### Collection `items`
| Champ | Type | Notes |
|-------|------|-------|
| `id` | string (auto) | PK |
| `event` | relation → events | FK |
| `participant` | relation → participants | FK |
| `name` | string | "Tiramisu maison" |
| `category` | select | apero, entree, plat, dessert, boissons, jeux, autre |
| `quantity` | string | Optionnel — "pour 8", "2 bouteilles"… |
| `created` | datetime (auto) | |

---

## 9. Fonctionnalités hors scope (v1)

Pour garder le MVP simple, on exclut volontairement :

- Système de comptes / login (on reste sur identification locale)
- Chat ou commentaires
- Système de votes ou de suggestions automatiques
- Liste de courses pré-remplie
- Gestion de budget / remboursements
- Intégration calendrier
- Mode sombre (sauf si trivial avec Material 3)

---

## 10. Critères de succès

- **Temps de création d'une soirée** : < 30 secondes
- **Temps pour rejoindre et ajouter un item** : < 20 secondes
- **Zéro inscription** requise
- **Temps réel** : un item ajouté apparaît chez les autres en < 2 secondes

---

## 11. Évolutions possibles (v2+)

- Suggestions intelligentes ("Il manque peut-être des boissons sans alcool ?")
- Templates de soirées (BBQ, raclette, brunch…)
- Mode "liste de souhaits" où l'hôte peut suggérer ce qui manque
- Historique des soirées passées
- Photo de l'événement / album collaboratif
- PWA web pour éviter l'installation