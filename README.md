# 🚀 VaporHub

> **L'outil tout-en-un de gestion, suivi et analytics pour créateurs de contenu (Twitch, YouTube, multi-plateformes).**

VaporHub est une plateforme modulaire sous forme de **monorepo**, combinant une API robuste Node.js / Express sécurisée et un tableau de bord réactif propulsé par Vue 3 et Vite.

---

## 🛠️ Stack Technique

### Backend
* **Runtime & Framework :** Node.js (ES Modules), Express 5
* **Base de données & ORM :** PostgreSQL (Supabase), Drizzle ORM
* **Sécurité & Authentification :**
  * Hachage de mot de passe : **Argon2id** (Standard OWASP)
  * Sessions & API : **JWT** (Access Token 15 min + Refresh Token en BDD 7 jours)
  * Stockage sensible : **Chiffrement symétrique AES-256-GCM** des tokens tiers (Twitch, etc.)
* **Intégrations Externes :** Twitch API Helix & Flux OAuth2 Authorization Code

### Frontend
* **Framework & Build :** Vue 3 (`<script setup>`, Composition API), Vite
* **Visualisation de données :** Chart.js
* **Architecture :** Découpage modulaire par couches (API Client, State/Composables, Vues, Composants)

### Orchestration
* **Gestion Monorepo :** `concurrently`

---

## ✨ Fonctionnalités Actuelles

- 🔐 **Système d'Authentification Complet :**
  - Inscription sécurisée & Connexion avec gestion automatique du rafraîchissement des tokens JWT.
  - Déconnexion et révocation de session en base de données.
- 🟣 **Intégration Twitch en Temps Réel :**
  - Connexion de chaîne via flux officiel OAuth2 Twitch.
  - Tracker de stream en direct : statut (Live / Hors ligne), avatar du créateur, jeu, titre et nombre de spectateurs en direct.
  - Synchronisation automatique en arrière-plan (Polling toutes les 30s) avec mise en pause intelligente si l'onglet est masqué.
  - Renouvellement automatique transparent des tokens Twitch expirés.
- 📈 **Historique des Streams & Analytics :**
  - Enregistrement automatique des sessions de live en BDD (calcul du pic d'audience, durée de diffusion).
  - Échantillonnage temporel des spectateurs (toutes les 2 min).
  - Graphiques d'audience interactifs avec Chart.js pour analyser les courbes de performance de chaque live.

---

## 📐 Structure du Monorepo

```text
VaporHub/
├── Backend/                 # API REST Express & Services
│   ├── src/
│   │   ├── controllers/     # Contrôleurs légers (Auth, Twitch)
│   │   ├── services/        # Logique métier & appels externes (Twitch API, Stream Tracker)
│   │   ├── routes/          # Définition des endpoints d'API (/api/auth, /api/twitch)
│   │   ├── middlewares/     # Middlewares (requireAuth, errorHandler)
│   │   ├── db/
│   │   │   ├── schemas/     # Schémas Drizzle ORM (users, oauthTokens, streamSessions, streamMetrics)
│   │   │   └── seed.js      # Script de génération de fausses données de test
│   │   └── utils/           # Fonctions de sécurité (Argon2, JWT, Chiffrement AES-256)
│   └── index.js             # Démarrage du serveur
│
├── Frontend/                # Application Client Vue 3 (Vite)
│   ├── src/
│   │   ├── api/             # Client HTTP centralisé & requêtes par domaine
│   │   ├── state/           # Gestion d'état global (useAuth)
│   │   ├── components/      # Composants UI (Navbar, TwitchCard, TwitchHistory)
│   │   ├── views/           # Écrans principaux (AuthView, DashboardView)
│   │   ├── style/           # Styles CSS globaux
│   │   ├── App.vue          # Coquille principale
│   │   └── main.js          # Bootstrap de Vue
│   └── vite.config.js       # Configuration Vite & plugins
│
├── Discord/                 # [Futur] Bot Discord pour les alertes de live
├── Mobile/                  # [Futur] Application mobile
├── AGENTS.md                # Règles de sécurité & guide de collaboration pour l'IA
├── package.json             # Scripts racine
└── README.md
```

---

## 🚀 Démarrage Rapide

### 1. Prérequis
* **Node.js** (v18 ou supérieur)
* **npm** (inclus avec Node.js)
* Un compte **Supabase** (PostgreSQL) et un compte **Twitch Developer**

---

### 2. Installation des dépendances

À la racine du projet :
```bash
npm install
npm install --prefix Backend
npm install --prefix Frontend
```

---

### 3. Configuration des variables d'environnement

1. **Dans le dossier `Backend/` :**  
   Copie `.env.exemple` vers `.env` et renseigne tes clés :
   ```env
   DATABASE_URL=ton_url_postgresql_supabase
   ENCRYPTION_KEY=cle_hex_32_bytes_64_chars
   TWITCH_CLIENT_ID=ton_twitch_client_id
   TWITCH_CLIENT_SECRET=ton_twitch_client_secret
   TWITCH_REDIRECT_URI=http://localhost:3000/api/twitch/callback
   JWT_ACCESS_SECRET=cle_secrete_jwt_access
   JWT_REFRESH_SECRET=cle_secrete_jwt_refresh
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   ```

2. **Dans le dossier `Frontend/` :**  
   Copie `.env.exemple` vers `.env` :
   ```env
   VITE_API_URL=http://localhost:3000/api
   ```

---

### 4. Base de données & Migrations

Dans le dossier `Backend/` :
```bash
# Générer et appliquer les tables Drizzle sur Supabase
npm run db:generate
npm run db:migrate
```

*(Optionnel) Générer de fausses données de stream pour tester les graphiques :*
```bash
node src/db/seed.js
# ou pour cibler un email spécifique :
node src/db/seed.js ton-email@exemple.com
```

---

### 5. Lancement de l'environnement de développement

À la racine du projet, lance une seule commande pour démarrer le Backend et le Frontend en parallèle :
```bash
npm run dev
```

* **Frontend Web :** [http://localhost:5173](http://localhost:5173)
* **Backend API :** [http://localhost:3000](http://localhost:3000)
* **Drizzle Studio (Visualiseur BDD) :** `npm run --prefix Backend db:studio` (ou `npx drizzle-kit studio`)

---

## 🤝 Workflow Git & Collaboration

Pour maintenir une base de code propre et pérenne à deux :

1. **Règle absolue :** Aucun push direct sur `main` ou `dev`. Tout travail passe par une branche dédiée et une **Pull Request (PR)**.
2. **Convention de nommage des branches :**
   * `feat/nom-de-la-feature` : Nouvelle fonctionnalité
   * `fix/nom-du-bug` : Correction de bug
   * `refactor/nom-de-la-tache` : Nettoyage / Refactoring
   * `security/nom-de-la-tache` : Hardening et sécurité
3. **Routine de travail :**
   ```bash
   # 1. Se synchroniser sur dev
   git checkout dev
   git pull origin dev

   # 2. Créer une nouvelle branche de travail
   git checkout -b feat/ma-nouvelle-feature

   # 3. Travailler, commiter et pusher
   git add .
   git commit -m "feat: description claire de la fonctionnalite"
   git push origin feat/ma-nouvelle-feature

   # 4. Ouvrir une Pull Request sur GitHub vers la branche dev
   ```

---

Bon dev sur **VaporHub** ! 🎬🍿