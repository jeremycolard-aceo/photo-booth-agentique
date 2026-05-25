# 📸 Photo Booth Agentique — Google Cloud Summit 2026

Une expérience de Photo Booth interactive et propulsée par l'Intelligence Artificielle, conçue spécialement pour le stand ACEO Tech lors du Google Cloud Summit 2026. 

L'application permet aux visiteurs de se prendre en photo via la webcam, de choisir un "Archétype Cloud", et d'être transformés en héros 3D stylisés grâce à **Google Cloud Vertex AI (Gemini Image)**.

---

## ✨ Fonctionnalités

* **Capture Webcam Intégrée :** Prise de photo directement depuis le navigateur avec compte à rebours.
* **Génération Image-to-Image :** Transformation du visage du visiteur en conservant ses traits, avec prise en charge du multi-personnages.
* **4 Archétypes Exclusifs :** Security Sentinel, AI Sorcerer, Cloud Architect, et Data Wrangler.
* **Galerie Drive Live :** Affichage en temps réel des avatars générés par les autres visiteurs du stand.
* **Leaderboard :** Suivi en direct des archétypes les plus populaires de la journée.
* **Envoi par Email :** Livraison automatique de l'avatar finalisé dans la boîte mail du visiteur avec un template HTML personnalisé.
* **Design & Audio :** Interface futuriste, effets sonores générés dynamiquement via l'API Web Audio, et révélations cinématiques.

---

## 🏗️ Architecture du Projet

Ce projet utilise une architecture hybride "Serverless" séparant strictement le Front-End (Interface) du Back-End (Logique et Sécurité).

### 1. Front-End (Côté Client / GitHub Pages)
Composé exclusivement de fichiers statiques hébergés sur GitHub.
* `index.html` : Squelette de l'application et structure UI.
* `style.css` : Design, animations et charte graphique ACEO.
* `scripts.js` : Logique applicative (gestion webcam, construction des prompts (Prompt Engineering), appels API).
* `card.html` : Iframe dédiée à l'affichage de l'avatar sous forme de "Trading Card".

### 2. Back-End (Côté Serveur / Google Apps Script)
Agit comme un proxy sécurisé pour masquer les clés API et orchestrer les services Google.
* **Vertex AI (Gemini 2.5 Flash Image) :** Reçoit le prompt et l'image en Base64 pour générer l'avatar.
* **Google Drive :** Stocke les images générées dans un dossier public et génère des URLs miniatures.
* **Google Sheets :** Sert de base de données pour enregistrer les utilisateurs, logger les générations et alimenter le Leaderboard.
* **Gmail :** Envoie l'image finale au participant.
