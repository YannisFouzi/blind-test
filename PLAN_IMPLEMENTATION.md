# Plan d’implémentation incrémentale (PartyKit, audio, état, synchro)

## 1) Transport temps réel autoritaire (rooms)
- Pourquoi ? Réduire la latence, ordonner les réponses/points côté serveur, sécuriser start/next/submit et éviter le spam/cheat. Supprimer la dépendance aux transactions/`serverTimestamp` Firestore côté client.
- Service/stack choisi : PartyKit (room = instance serveur), messages typés via Zod existants, persistance minimale (ou nulle) côté Firestore.
- Points clés : routes messages (`join`, `start`, `answer`, `next`, `heartbeat`), validation host/joueur, recalcul des points serveur, broadcast état courant. Prévoir TTL room (auto-close quand plus de clients ou inactif).

## 2) Synchro d’horloge client/serveur
- Pourquoi ? Aligner les déclenchements audio et le tempo du jeu entre clients, éviter les dérives.
- Service/stack choisi : mini-protocole NTP maison via PartyKit (ping/pong + calcul offset/latence), hook client qui expose `now()` corrigé.
- Points clés : mesurer périodiquement, lisser l’offset (moyenne glissante), exposer `syncedAt`, `driftMs`.

## 3) Player audio avec Tone.js + préchargement
- Pourquoi ? Scheduling précis, fondu/crossfade, lancement sans blanc, contrôle fin du transport.
- Service/stack choisi : Tone.js (import dynamique client), préchargeur LRU maison (MP3 → AudioBuffer) avec politique mémoire.
- Points clés : CORS sur R2, fallback `<audio>` si Tone indispo, gestion erreurs réseau, API hook stable (`play/pause/seek/preload`).

## 4) Store client partagé (état room/player)
- Pourquoi ? Éviter la prolifération des subscriptions/hook, partager `room/players/responses` entre composants.
- Service/stack choisi : Zustand (optionnel mais recommandé), hydraté par les events PartyKit.
- Points clés : un seul abonnement WebSocket → store, sélecteurs fins pour limiter les re-renders, reset propre à la fin de room.

## 5) Cycle de vie / cleanup
- Pourquoi ? Ne pas laisser de rooms orphelines, aligner le lifecycle avec PartyKit.
- Service/stack choisi : hooks PartyKit (close quand 0 client + TTL), suppression du cleanup-service Railway si plus de persistance Firestore.
- Points clés : timer d’inactivité, purge des buffers/preloads à la fermeture, éventuellement log minimal (debug) côté serveur.

## 6) Observabilité et robustesse
- Pourquoi ? Diagnostiquer latence, erreurs et churn joueurs; fiabiliser l’UX.
- Service/stack choisi : logs structurés PartyKit, events front (console opt-in), retries/backoff côté client sur les actions critiques.
- Points clés : métriques simples (latence moyenne sync, temps de réponse `submit`, taux d’erreur), affichage UX d’état réseau.

## 7) Tests et contrats
- Pourquoi ? Garantir la stabilité des points/ordre des réponses et des messages temps réel.
- Service/stack choisi : tests unitaires sur calcul des points/ordonnancement (serveur), tests d’intégration WebSocket (Happy path + double answer), validation Zod partagée.
- Points clés : snapshot de protocole, tests de dérive/offset, test de TTL room.

## 8) Déploiement et feature flags
- Pourquoi ? Déployer sans casse, basculer progressivement.
- Service/stack choisi : feature flag pour PartyKit (toggle transport Firestore → WS), déploiement PartyKit + Vercel, nettoyage Railway (cleanup-service) si plus utile.
- Points clés : phase dual-run optionnelle (lecture Firestore en backup), doc d’activation, rollback simple.
