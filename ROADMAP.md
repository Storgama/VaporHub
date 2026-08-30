# 🗺️ VaporHub — Roadmap & Suivi du Projet

Ce document sert de référence pour le suivi des versions, des fonctionnalités en cours et des chantiers futurs sur **VaporHub**.

---

## 📌 Convention de Versionnage (SemVer)

* **`v1.0.0` (Version Majeure `X`) :** Première release officielle stable pour la **Mise en Production**.
* **`v0.X.0` (Versions Mineures `X.Y`) :** Versions d'évolutions fonctionnelles majeures durant le développement.
* **`v0.X.X` (Patchs `X.Y.Z`) :** Correctifs de bugs et ajustements de conception.

---

## 🎯 Jalons de Développement (Roadmap)

### 🎨 Jalon `v0.2.0` : Refonte Design & Système UI *(Sprint en cours)*
- [ ] **Installer Tailwind CSS :** Configuration sur Vite (`tailwind.config.js`, `postcss.config.js`).
- [ ] **Centraliser les styles :** Supprimer les `<style scoped>` éparpillés et unifier la charte graphique.
- [ ] **Thème Dark Moderne (SaaS) :**
  - [ ] Palette sombre profonde (`zinc-900`/`zinc-950`), bordures subtiles (`zinc-800`), effets de cartes.
  - [ ] Accents de couleurs (Violet Twitch `#9146ff`, Vert Live `#00ff88`, Rouge alerte).
- [ ] **Intégrer les icônes vectorielles :** Remplacer les émojis par la bibliothèque `lucide-vue-next`.
- [ ] **Styliser le Graphique Chart.js :** Dégradés de couleur sous la courbe, infobulles (*tooltips*) personnalisées et KPIs (Pic, Moyenne, Durée).
- [ ] **Refonte visuelle de l'Authentification :** Formulaires modernes avec onglets et retours visuels soignés.

---

### ⚙️ Jalon `v0.3.0` : Robustesse & Optimisations Backend
- [ ] **Contrôle & Limitation de trafic :** Gestion avancée des quotas et requêtes sur l'API.
- [ ] **Renforcement des communications réseau et en-têtes.**
- [ ] **Validation stricte des schémas de données.**
- [ ] **Optimisation et assainissement des builds de production.**

---

### 📊 Jalon `v0.4.0` : Analytics Avancées & Planning Créateur
- [ ] **KPIs Globaux :** Cartes de résumé (Total heures streamées, Moyenne de spectateurs, Jeu le plus performant).
- [ ] **Filtres de recherche :** Filtrer l'historique par jeu ou par période (7 jours, 30 jours, mois).
- [ ] **Comparateur de lives :** Comparer les performances de 2 streams sur un même graphique.
- [ ] **Export des Analytics :** Export des métriques au format CSV ou PDF.
- [ ] **Module Planning de Stream :** Calendrier pour programmer ses prochains lives avec lien public partageable.

---

### 🤖 Jalon `v0.5.0` : Outils Créateur & Bot Twitch
- [ ] **Connexion du Bot au Chat :** Activation et jonction du Bot VaporHub sur le chat du streamer en 1 clic.
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

### ✅ `v0.1.0` — Socle Technique, Authentification & Tracker Twitch Initial *(Août 2026)*
- [x] **Monorepo & Environnement :** Configuration racine avec `concurrently` (ports 3000 et 5173).
- [x] **Authentification Sécurisée :** Hachage Argon2id + Double JWT (Access 15m / Refresh 7d en BDD Supabase).
- [x] **Architecture Frontend Vue 3 :** Découpage modulaire (API Client, useAuth, Vues, Composants).
- [x] **Intégration Twitch OAuth2 :** Flux officiel d'autorisation et récupération de profil (avatar, pseudo).
- [x] **Sécurité BDD :** Chiffrement des tokens tiers en base de données.
- [x] **Live Tracker Temps Réel :** Synchronisation automatique (Polling silencieux 30s) avec pause en arrière-plan.
- [x] **Auto-Refresh des Tokens Twitch :** Renouvellement transparent des tokens expirés en backend.
- [x] **Base de Données Analytics :** Tables Drizzle `stream_sessions` et `stream_metrics` indexées.
- [x] **Graphiques d'Audience Interactifs :** Intégration de Chart.js dans `TwitchHistory.vue`.
- [x] **Script de Seeding Configurable :** Injection de données de test dynamiques.
- [x] **Documentation & Gouvernance :** `README.md` complet et `AGENTS.md` pour les règles de collaboration IA.
