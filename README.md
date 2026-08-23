🚀 VaporHub
Outil de gestion et suivi de contenu

Bienvenue sur le projet VaporHub ! Ce monorepo regroupe le serveur backend Node.js / Express et le client frontend propulsé par Vite.

🛠️ Stack Technique
Backend : Node.js, Express, ES Modules

Frontend : Vite, HTML/CSS/JS (Vanilla)

Orchestration : Concurrently

🚀 Démarrage Rapide
1. Prérequis
Avoir Node.js (v18 ou supérieur) et npm installés.

2. Installation
À la racine du projet :

npm install

3. Lancement en dev
Pour lancer le Backend et le Frontend en parallèle avec une seule commande :

npm run dev

Frontend : http://localhost:5173

Backend API : http://localhost:3000

📐 Structure du Monorepo
Vaporhub/
├── backend/          # API Express & services
├── frontend/         # Application Web Vite
├── package.json      # Configuration racine & scripts Concurrently
└── README.md

🤝 Workflow Git & Collaboration
Pour travailler proprement à deux :

1. Règle absolue
Aucun push direct sur main. Tout travail passe par une branche dédiée et une Pull Request (PR).

2. Nommage des branches
feat/nom-de-la-tache : Nouvelle fonctionnalité

fix/nom-du-bug : Correction de bug

refactor/nom-de-la-tache : Nettoyage / Refacto

3. Routine de dev
Se remettre sur main et récupérer le code à jour :
git checkout main
git pull origin main

Créer une nouvelle branche :
git checkout -b feat/ma-feature

Coder, commiter et pusher :
git add .
git commit -m "feat: description de la tache"
git push origin feat/ma-feature

4. Validation
Ouvre une Pull Request sur GitHub (ou via l'extension VS Code).

Assigne ton binôme pour la Code Review.

Après le merge, remets-toi sur main localement et fais un git pull origin main.

Bon dev sur VaporHub ! 🎬