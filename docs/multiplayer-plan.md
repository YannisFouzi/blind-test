## Multijoueur – Plan de mise en œuvre

### 0) Pré-requis
- Identité fiable: Firebase Auth (anonyme accepté).
- Base temps réel: Firestore (snapshots + transactions) ou service WS sur Railway (Node/TS, zod, pino) avec Firestore/Postgres en persistance.

### 1) Modèle de données Firestore
- `rooms/{roomId}`: hostId, universeId, songs[], currentSongIndex, state (idle|playing|results), startedAt, createdAt, updatedAt.
- `rooms/{roomId}/players/{playerId}`: displayName, score, connected, lastSeen.
- `rooms/{roomId}/responses/{docId}`: songId, playerId, selectedWorkId, timestamp, rank, points.
- Transactions: à l’insertion d’une réponse, vérifier unicité, calculer rank/points (barème fonction du nombre de joueurs actifs), mettre à jour le score du joueur.

### 2) API côté client (hooks)
- `useRoom(roomId)`: subscribe room + players + responses; expose state (room, players, responses, currentSong, state) et actions (startGame, submitAnswer, nextSong, leaveRoom, setReady).
- `useGame`:
  - Mode solo: conserver le comportement actuel (state local).
  - Mode multi: consommer `useRoom` comme source de vérité (scores/réponses ne sont plus en local).
- `useAudioPlayer`: ajouter `playAt(startedAt)` pour lancer l’audio avec offset (startedAt serveur).

### 3) Flux métier
- Lobby: create/join room, liste des joueurs, bouton Start (host).
- Start (host): state=playing, currentSongIndex=0, startedAt=timestamp serveur.
- SubmitAnswer: transaction Firestore (ou logique WS) pour rank/points; une seule réponse par joueur/morceau.
- Results: quand tous ont répondu ou timeout, passer state=results (afficher ordre/points). Pas de passage auto.
- Next (host uniquement): state=playing, currentSongIndex++, nouveau startedAt; reset affichage de résultats.
- Timeout (option): si pas de réponse avant la fin, 0 point, passage en results en attendant le host.

### 4) UI/UX
- Boutons host-only: Start, Next.
- Affichages: scoreboard live, ordre d’arrivée par round, statut joueurs (connecté/absent), état room (idle/playing/results).
- Synchro audio: lancer le player local avec offset d’horloge par rapport à startedAt.

### 5) Sécurité/robustesse
- Validation des payloads (zod) côté client et serveur/CF.
- Transactions pour éviter les doubles réponses et garantir le calcul du rank.
- Heartbeat lastSeen pour déterminer les joueurs actifs (barème dynamique).
- Pas d’auto-next: le host pilote le passage de morceau.

### 6) Étapes de livraison
1. Implémenter les collections Firestore + transactions (sans UI).
2. Ajouter `useRoom` (subscribe + actions) et basculer `useGame` en “solo ou multi selon roomId”.
3. Créer le lobby (create/join, liste des joueurs, Start/Next host).
4. Brancher le player sur startedAt (synchro) et afficher résultats/ordre d’arrivée.
5. Tests: flux complet à 2-3 joueurs, déconnexions/reconnexions, timeouts, barème.
