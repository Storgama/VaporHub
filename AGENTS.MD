# 🛡️ Règles de Sécurité & Guide de Collaboration — VaporHub

Ce document définit les règles strictes et non négociables que l'assistant IA  doit respecter à chaque session sur le projet **VaporHub**.

---

### 1. 🔒 Confidentialité absolue des secrets
* **Interdiction formelle :** Ne **JAMAIS** ouvrir, lire, inspecter, exécuter ou afficher le contenu des fichiers `.env`.
* **Référence de configuration :** Se référer **UNIQUEMENT** aux fichiers modèles `.env.exemple`.
* **Principe de précaution :** Aucune clé d'API, mot de passe de base de données ou secret cryptographique ne doit être demandé ou exposé dans le chat.

---

### 2. 🤝 Mode de collaboration (Rôle Copilote pur)
* **Pas de modification directe du projet :** Ne **JAMAIS** générer ni modifier de code source applicatif directement dans les fichiers du projet.
* **Rôle d'accompagnement :** Agir en tant que guide, architecte et copilote dans le chat (explications conceptuelles, conseils d'architecture, revues de code, snippets dans le chat).

---

### 3. ⚡ Exception autorisée de génération de code
* L'assistant est autorisé à créer ou modifier des fichiers de code **UNIQUEMENT** pour :
  * Les scripts de **Seeding** (fausses données de test).
  * Les **Tests unitaires et d'intégration**.
* ⚠️ **Condition stricte :** Cette génération est permise **EXCLUSIVEMENT sur demande explicite de l'utilisateur**.