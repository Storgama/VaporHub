# 🗺️ VaporHub — Roadmap & Suivi du Projet

Ce document sert de référence pour le suivi des versions, des fonctionnalités en cours et des chantiers futurs sur **VaporHub**.

---

## 📌 Convention de Versionnage (SemVer)

* **`v1.0.0` (Version Majeure `X`) :** Première release officielle stable pour la **Mise en Production**.
* **`v0.X.0` (Versions Mineures `X.Y`) :** Versions d'évolutions fonctionnelles majeures durant le développement.
* **`v0.X.X` (Patchs `X.Y.Z`) :** Correctifs de bugs et ajustements de conception.

---

## 🎯 Jalons de Développement (Roadmap)

### 📊 Jalon `v0.4.0` : Analytics de Rétention, Fidélisation & Planning *(Prochain Sprint)*
- [ ] **Score de Rétention (Moyenne vs Pic) :** Calcul et affichage du ratio de rétention d'audience pour chaque stream.
- [ ] **Watch Time Cumulé (Heures-Vues) :** Mesure exacte du volume d'heures d'attention humaine captée par mois.
- [ ] **Cartes KPIs Globales de Rétention :** Résumé visuel en haut du Dashboard (Heures-Vues, Taux de Rétention, Moyenne de spectateurs, Durée moyenne).
- [ ] **Analyse de Dynamique sur le Graphique :** Visualisation des gains et pertes d'audience au cours du live.
- [ ] **Comparateur de Lives :** Comparaison de deux sessions sur un même graphique pour identifier les formats les plus captivants.
- [ ] **Module Planning de Stream :** Calendrier interactif pour programmer ses prochains rendez-vous de stream.

---

### 🤖 Jalon `v0.5.0` : Outils Créateur & Bot Twitch
- [ ] **Connexion du Bot au Chat :** Activation et jonction du Bot VaporHub sur le chat du streamer en 1 clic.
- [ ] **Spectateurs Uniques & Temps Moyen par Viewer :** Suivi nominatif des présences dans le chat pour calculer le temps moyen passé par viewer.
- [ ] **Gestionnaire de Commandes personnalisées :** Interface de création/modification de commandes de chat (ex: `!discord`, `!planning`, `!uptime`, `!socials`).
- [ ] **Messages Programmés (Timers) :** Envoi automatique de messages périodiques dans le chat (rappels réseaux, liens Discord).
- [ ] **Journal des événements en direct :** Suivi des follows, subs et raids en temps réel sur le Dashboard.

---

### 💬 Jalon `v0.6.0` : Bot Discord & Alertes Communauté (`Discord/`)
- [ ] **Initialisation du projet Bot :** Setup `discord.js` dans le dossier `Discord/`.
- [ ] **Notification de Live automatique :** Alerte automatique avec mention `@everyone` et embed riche sur le serveur Discord du streamer dès qu'il lance son live.
- [ ] **Commandes Slash Discord (`/live`, `/planning`, `/stats`) :** Permettre à la communauté de consulter l'état de la chaîne et le planning directement sur Discord.

---

### 🔴 Jalon `v0.7.0` : Multi-Plateforme (Intégration YouTube)
- [ ] **OAuth2 Google / YouTube :** Bouton *"Lier ma chaîne YouTube"*.
- [ ] **Tracker YouTube Live & Abonnés :** Afficher le nombre d'abonnés, les dernières vidéos et le statut des lives YouTube.
- [ ] **Vue Agrégée Multi-Stream :** Vue simultanée Twitch + YouTube sur un seul tableau de bord.

---

### 🚀 Jalon `v1.0.0` : Première Release Officielle en Production
- [ ] Recette globale & Tests de bout en bout.
- [ ] Déploiement Cloud (PostgreSQL Supabase Prod, Serveur API, Hébergement Frontend).
- [ ] Nom de domaine personnalisé, certificats SSL et configuration DNS.
- [ ] Documentation utilisateur finale.

---

### 📱 Post-v1.0.0 (Évolutions Futures)
- [ ] **Application Mobile (`Mobile/`) :** Application smartphone pour suivre son live et ses métriques en mobilité.
- [ ] **Nouvelles Plateformes :** Intégration de Kick et TikTok Live.

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
