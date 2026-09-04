# 🗺️ VaporHub — Roadmap & Centre de Contrôle Créateur

Ce document sert de référence officielle pour le suivi des versions, des fonctionnalités et des chantiers de **VaporHub**, le centre de contrôle tout-en-un pour le streaming et la création de contenu.

---

## 📌 Convention de Versionnage (SemVer)

* **`v1.0.0` (Version Majeure `X`) :** Première release officielle stable pour la **Mise en Production**.
* **`v0.X.0` (Versions Mineures `X.Y`) :** Évolutions fonctionnelles majeures durant le développement.
* **`v0.X.X` (Patchs `X.Y.Z`) :** Correctifs de bugs et ajustements de sécurité/conception.

---

## 🎯 Jalons de Développement (Roadmap Active)

### ️ Jalon `v0.4.0` : Le Cockpit Live Twitch & Sécurité Renforcée *(Sprint Actuel)*
> **Objectif :** Supprimer les onglets inutiles en live, éliminer la friction mentale du streamer et sécuriser le socle analytique.

- [x] **Analytics de Rétention & Watch Time :** Calcul automatique de la fidélité, temps de visionnage et progression sur 2 ans d'historique.
- [x] **Page Statistiques Haute Performance :** Élimination du problème $N+1$ (requêtes SQL groupées sub-50ms) et navigation dynamique par période.
- [x] **Seeding Réaliste sur 2 ans :** 315 streams simulés avec croissance progressive pour les tests de charge.
- [ ] **Le Radar Publicitaire Twitch (`Ad Schedule API`) :**
  - Compte à rebours avant la prochaine coupure pub obligatoire.
  - Indicateur de temps garanti sans pré-roll (*Preroll Free Time*).
  - Déclencheur 1-clic pour lancer une pause pub de 90s directement depuis le Dashboard.
- [ ] **Alerte Live Discord "Natia" (Webhook Découplé) :**
  - Configuration du Webhook Discord dans les paramètres.
  - Déclencheur d'annonce de live avec le ton piquant et sarcastique de Natia.
- [ ] **Blindage de Sécurité & Zero-Trust :**
  - Chiffrement fort AES-256-GCM systématique sur tous les tokens OAuth tiers.
  - Validation stricte Zod et Rate Limiting actif (IETF Draft-7).

---

### 🎮 Jalon `v0.5.0` : Le Journal du Scientifique & Tracker 100%
> **Objectif :** Suivre la complétion des jeux étudiés en live et synchroniser l'état d'avancement de la commu.

- [ ] **Module "Game Study Tracker" (BDD & UI) :**
  - Table `game_studies` (Jeu, statut : *En cours / Validé 100% / Abandonné*, pourcentage de complétion, temps passé, verdict du Scientifique).
  - Interface visuelle sur VaporHub pour mettre à jour la jauge de progression en 2 clics.
- [ ] **Synchronisation Discord du Labo :**
  - Envoi / mise à jour automatique d'un embed Discord récapitulatif avec l'état actuel des recherches du Scientifique.
- [ ] **Flux d'Événements Live en Direct (Twitch EventSub) :**
  - Colonne latérale sur le Dashboard avec les follows, subs et raids en direct (sans dépendre d'IRC).

---

###  Jalon `v0.6.0` : Multi-Plateforme (YouTube Live & Annonces Contenu)
> **Objectif :** Ouvrir le cockpit à YouTube et gérer la communication cross-plateforme.

- [ ] **Intégration YouTube Live (Data API v3) :**
  - Connexion OAuth2 de la chaîne YouTube (architecture multi-chaîne extensible).
  - Radar de live YouTube avec détection synchronisée (anti-dépassement de quota des 10 000 unités/jour).
  - Jauge d'**Audience Multistream Unifiée** (Viewers Twitch + Viewers YouTube en direct sur un seul écran).
- [ ] **Diffuseur d'Annonces Vidéos :**
  - Module d'annonce automatique lors de la sortie d'une nouvelle vidéo YouTube (Webhook Discord + X/Twitter).

---

### 🤖 Jalon `v0.7.0` : Le Cerveau de Natia (IA Découplée)
> **Objectif :** Donner corps et voix à l'IA sarcastique du lore.

- [ ] **Service Autonome `Natia Engine` :**
  - Moteur de personnalité IA connecté aux événements de VaporHub via un bus découplé.
  - Roasts et débriefs sarcastiques générés après chaque stream.
  - Réactions interactives sur Discord avec la communauté.

---

### 🚀 Jalon `v1.0.0` : Déploiement Cloud & Zero-Trust Production
- [ ] Audit de sécurité complet (Pentest local, revue de surface d'attaque OWASP).
- [ ] Déploiement en production (Supabase Prod, API Cloud, SSL, nom de domaine).
- [ ] Tests de charge et vérification de la tolérance aux pannes.

---

## 🏆 Historique des Versions Livrées (Changelog)

### ✅ `v0.3.0` — Robustesse, Sécurité & Suite de Tests Automatisés *(Septembre 2026)*
- [x] **Rate Limiting & Anti-Bruteforce :** Protection par IP sur `/api/auth/login` et `/api/auth/register` via `express-rate-limit` (IETF Draft-7).
- [x] **En-têtes HTTP de Sécurité (Helmet) :** Intégration de `helmet` (HSTS, CSP, X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff, suppression de `X-Powered-By`).
- [x] **CORS Dynamique & Restreint :** Restriction d'accès à la variable d'environnement `process.env.FRONTEND_URL`.
- [x] **Validation Stricte des Entrées (Zod) :** Validation stricte des schémas d'inscription/connexion (mot de passe 12+ chars, email conforme, allowlist `.strip()`).
- [x] **Timeouts Réseau Stricts :** Protection anti-starvation avec `AbortSignal.timeout(5000)` sur tous les appels Twitch.
- [x] **Masquage d'Erreurs en Production :** Protection contre la fuite d'informations internes de BDD en mode `production`.
- [x] **Standard de Sécurité (RFC 9116) :** Endpoint `/.well-known/security.txt` dynamique.
- [x] **Suite de Tests Automatisés (95%+ Fullstack) :** 115 tests unitaires et d'intégration avec Vitest & Vue Test Utils exécutés en < 4s (`npm test`).

### ✅ `v0.2.0` — Refonte Design, Thème Dark & Système UI *(Septembre 2026)*
- [x] **Intégration Tailwind CSS v4 :** Configuration moderne avec `@tailwindcss/vite` et suppression des styles CSS bruts.
- [x] **Bibliothèque d'Icônes Vectorielles :** Remplacement des émojis par `lucide-vue-next`.
- [x] **Thème Dark Moderne :** Palette SaaS sombre (`zinc-900`/`zinc-950`), bordures subtiles et accents de couleur par plateforme (Twitch Violet `#9146ff`, Live Vert `#00ff88`).
- [x] **Graphique Chart.js Amélioré :** Dégradés néon sous la courbe, infobulles personnalisées sombres et responsive 2 colonnes.
- [x] **Composants Modernisés :** `Navbar.vue`, `AuthView.vue`, `TwitchCard.vue`, `TwitchHistory.vue`.

### ✅ `v0.1.0` — Socle Technique, Authentification & Tracker Twitch Initial *(Août 2026)*
- [x] **Monorepo & Environnement :** Configuration racine avec `concurrently` (ports 3000 et 5173).
- [x] **Authentification Sécurisée :** Hachage Argon2id + Double JWT (Access 15m / Refresh 7d en BDD Supabase).
- [x] **Architecture Frontend Vue 3 :** Découpage modulaire (API Client, useAuth, Vues, Composants).
- [x] **Intégration Twitch OAuth2 :** Flux officiel d'autorisation et récupération de profil (avatar, pseudo).
- [x] **Sécurité BDD :** Chiffrement des tokens tiers (AES-256-GCM) en base de données.
- [x] **Live Tracker Temps Réel :** Synchronisation automatique (Polling silencieux 30s) avec pause en arrière-plan.
- [x] **Auto-Refresh des Tokens Twitch :** Renouvellement transparent des tokens expirés en backend.
- [x] **Base de Données Analytics :** Tables Drizzle `stream_sessions` et `stream_metrics` indexées (1 table = 1 fichier).
- [x] **Script de Seeding Configurable :** Injection de données de test dynamiques (`Backend/src/db/seed.js`).
- [x] **Documentation & Gouvernance :** `README.md` complet et `AGENTS.md` pour les règles de collaboration IA.
