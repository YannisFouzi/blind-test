# Migration Lobby vers Multi-Party PartyKit

**Date** : 2025-12-03
**Objectif** : Migrer complètement le système de rooms vers l'architecture PartyKit Multi-Party (standard industrie)
**Statut** : Planification

---

## 📊 État actuel (Problèmes)

### Architecture hybride bricolée
```
Client
  ↓
Firestore (createRoom, subscribeIdleRooms) ← Pas de sync
  ↓
PartyKit (Jeu temps réel)
  ↓
Railway Cleanup Service (externe)
```

**Problèmes identifiés** :
- ❌ Firestore utilisé comme lobby (pas fait pour ça, lent)
- ❌ Aucune synchronisation entre Firestore et PartyKit
- ❌ Rooms zombies : `state: "playing"` dans PartyKit mais `state: "idle"` dans Firestore
- ❌ Rooms apparaissent dans la liste même quand le jeu a démarré
- ❌ Aucun cleanup automatique
- ❌ Service Railway externe pour le cleanup

---

## 🎯 Architecture cible (PRO - Standard industrie)

### Pattern PartyKit Multi-Party
```
Client
  ↓
┌─────────────────────────────────┐
│   Lobby Party (1 instance)      │ ← Singleton, track toutes les rooms
│   /parties/lobby/main            │
│   - Liste rooms idle             │
│   - Broadcast temps réel         │
│   - Storage persistant           │
└─────────────────────────────────┘
         ↓ HTTP notifications
┌─────────────────────────────────┐
│   Game Parties (N instances)    │ ← 1 instance par room
│   /parties/game/{roomId}         │
│   - Jeu temps réel               │
│   - Notifie Lobby des changes    │
│   - Auto-cleanup via Alarms      │
└─────────────────────────────────┘
```

**Avantages** :
- ✅ 100% PartyKit (pas de Firestore pour rooms)
- ✅ Liste temps réel (WebSocket broadcast)
- ✅ Rooms disparaissent instantanément quand jeu démarre
- ✅ Auto-cleanup après 2min d'inactivité (PartyKit Alarms)
- ✅ Pas de service externe
- ✅ Architecture standard multiplayer games

---

## 📝 Plan de migration (Incrémental, sans casser)

### Phase 1 : Créer le Lobby Party ⏳

**Fichier** : `party/lobby.ts`

**Responsabilités** :
- Maintenir la liste des rooms actives en `room.storage`
- Recevoir notifications HTTP des Game Parties
- Exposer la liste via WebSocket aux clients connectés
- Filtrer uniquement les rooms avec `state: "idle"`

**API** :
```typescript
// WebSocket Messages (serveur → client)
{
  type: "rooms_list",
  rooms: [
    {
      id: "abc123",
      hostName: "Alice",
      state: "idle",
      playersCount: 2,
      maxPlayers: 8,
      createdAt: 1234567890
    }
  ]
}

// HTTP POST (Game Party → Lobby Party)
POST /parties/lobby/main
Body: {
  type: "room_created" | "room_state_changed" | "room_deleted",
  roomId: "abc123",
  state?: "idle" | "playing" | "results",
  hostName?: "Alice",
  playersCount?: 2
}
```

**Storage schema** :
```typescript
// Key: `room:{roomId}`
// Value: RoomMetadata
{
  id: string,
  hostName: string,
  state: "idle" | "playing" | "results",
  playersCount: number,
  createdAt: number,
  updatedAt: number
}
```

---

### Phase 2 : Modifier Game Party pour notifier Lobby ⏳

**Fichier** : `party/index.ts`

**Modifications** :
1. Ajouter méthode `notifyLobby(event, data)`
2. Appeler `notifyLobby` lors des événements :
   - `onConnect` (premier joueur) → `room_created`
   - `handleStart` → `room_state_changed` (idle → playing)
   - `handleNext` (fin de jeu) → `room_state_changed` (playing → results)
   - `onClose` (dernier joueur) → `room_deleted` (ou via Alarm)

**Exemple** :
```typescript
private async notifyLobby(type: string, data: any) {
  const lobbyUrl = `${this.room.context.parties.lobby.url}/main`;
  await fetch(lobbyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, roomId: this.room.id, ...data })
  });
}

// Dans handleStart
async handleStart(...) {
  this.state.state = "playing";
  await this.notifyLobby("room_state_changed", {
    state: "playing",
    playersCount: this.state.players.size
  });
  // ...
}
```

---

### Phase 3 : Ajouter Auto-cleanup avec PartyKit Alarms ⏳

**Fichier** : `party/index.ts`

**Fonctionnalité** :
- Quand dernier joueur se déconnecte → planifier Alarm dans 2min
- Si la room est toujours vide après 2min → supprimer + notifier Lobby
- Si quelqu'un rejoint avant → annuler l'Alarm

**Implémentation** :
```typescript
async onClose(conn: Party.Connection) {
  // ... code existant ...

  if (!hasConnectedPlayers) {
    // Planifier suppression dans 2min
    await this.room.storage.setAlarm(Date.now() + 2 * 60 * 1000);
  }
}

async onAlarm() {
  const hasPlayers = Array.from(this.state.players.values()).some(p => p.connected);

  if (!hasPlayers) {
    // Notifier le lobby que la room est supprimée
    await this.notifyLobby("room_deleted", {});

    // Nettoyer le storage
    await this.room.storage.deleteAll();

    console.log(`[${this.room.id}] Room auto-deleted after inactivity`);
  }
}
```

---

### Phase 4 : Créer le hook client `useLobby` ⏳

**Fichier** : `src/hooks/useLobby.ts`

**Responsabilités** :
- Se connecter au Lobby Party via WebSocket
- Écouter les broadcasts de la liste des rooms
- Exposer `rooms: RoomMetadata[]`

**API** :
```typescript
export const useLobby = () => {
  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = new PartySocket({
      host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999",
      party: "lobby",
      room: "main",
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "rooms_list") {
        setRooms(message.rooms);
      }
    });

    return () => socket.close();
  }, []);

  return { rooms, isConnected };
};
```

---

### Phase 5 : Adapter HomeContent pour utiliser useLobby ⏳

**Fichier** : `src/components/home/HomeContent.tsx`

**Modifications** :
1. Remplacer `subscribeIdleRooms` par `useLobby()`
2. Supprimer `createRoom` de Firestore
3. Créer room directement en se connectant à PartyKit
4. Notifier le Lobby via HTTP POST après connexion

**Avant** :
```typescript
// Firestore
const result = await createRoom({ hostId, hostDisplayName });
const unsubscribe = subscribeIdleRooms(setRoomsList);
```

**Après** :
```typescript
// PartyKit direct
const { rooms } = useLobby();
setRoomsList(rooms.filter(r => r.state === "idle"));

// Pas besoin de createRoom, juste se connecter
const roomId = generateId();
// Se connecter à /parties/game/{roomId} crée automatiquement la room
```

---

### Phase 6 : Configurer partykit.json pour Multi-Party ⏳

**Fichier** : `partykit.json`

**Configuration** :
```json
{
  "name": "blind-test-party",
  "compatibilityDate": "2024-11-01",
  "parties": {
    "game": "party/index.ts",
    "lobby": "party/lobby.ts"
  }
}
```

---

### Phase 7 : Supprimer code Firestore obsolète ⏳

**Fichiers à modifier** :
- `src/services/firebase/rooms.ts` :
  - Supprimer `createRoom`
  - Supprimer `subscribeIdleRooms`
  - Supprimer `joinRoom`
  - Garder uniquement ce qui concerne Firebase Auth et universes/works/songs

- `src/components/home/HomeContent.tsx` :
  - Supprimer imports Firestore rooms
  - Supprimer `subscribeRoom` (pour guest auto-redirect)
  - Supprimer cleanup `/api/cleanup-room`

**Fichiers à supprimer** :
- `src/app/api/cleanup-room/route.ts`
- `cleanup-service/` (service Railway)

---

### Phase 8 : Tests de validation ⏳

**Scénarios à tester** :

1. **Création room** :
   - Host se connecte à une nouvelle room
   - Room apparaît dans la liste du lobby
   - Autres joueurs voient la room

2. **Start game** :
   - Host démarre le jeu
   - Room disparaît instantanément de la liste
   - Nouveau joueur ne peut plus rejoindre

3. **Reconnexion** :
   - Joueur se déconnecte/reconnecte
   - Son état est préservé

4. **Auto-cleanup** :
   - Tous les joueurs quittent
   - Attendre 2 minutes
   - Vérifier que la room disparaît du Lobby

5. **Multiplayer** :
   - 2-4 joueurs dans une room
   - Vérifier que le jeu fonctionne
   - Vérifier le bouton "Next" après all_players_answered

---

## 📦 Dépendances

**Aucune nouvelle dépendance** ✅
- `partykit` : déjà installé
- `partysocket` : déjà installé
- `zod` : déjà installé

---

## 🔄 Rollback plan

Si la migration échoue :

1. **Garder** : `party/index.ts` (Game Party) fonctionne déjà
2. **Rollback** : Réactiver Firestore `createRoom` et `subscribeIdleRooms`
3. **Supprimer** : `party/lobby.ts` et `useLobby.ts`
4. **Restaurer** : Ancien `HomeContent.tsx` depuis Git

---

## 📊 Métriques de succès

- ✅ Latence affichage liste rooms : < 100ms (vs ~500ms Firestore)
- ✅ Rooms disparaissent instantanément quand jeu démarre
- ✅ Auto-cleanup fonctionne (0 rooms zombies)
- ✅ Pas de service externe (Railway supprimé)
- ✅ 100% PartyKit (Firestore uniquement pour auth + content)

---

## 🚀 Ordre d'implémentation

### Jour 1 : Setup Lobby Party
- [ ] Créer `party/lobby.ts`
- [ ] Configurer `partykit.json` (multi-party)
- [ ] Tester connexion WebSocket au lobby
- [ ] Implémenter storage + API HTTP

### Jour 2 : Intégration Game → Lobby
- [ ] Ajouter `notifyLobby` dans `party/index.ts`
- [ ] Notifier lors des événements (create, start, end)
- [ ] Tester avec logs

### Jour 3 : Auto-cleanup
- [ ] Implémenter PartyKit Alarms
- [ ] Tester cleanup après 2min
- [ ] Valider suppression du Lobby

### Jour 4 : Client
- [ ] Créer `useLobby.ts`
- [ ] Adapter `HomeContent.tsx`
- [ ] Supprimer Firestore rooms

### Jour 5 : Tests & Cleanup
- [ ] Tester tous les scénarios
- [ ] Supprimer code obsolète
- [ ] Supprimer Railway service
- [ ] Documentation

---

## 📚 Références

- [PartyKit Multi-Party Pattern](https://docs.partykit.io/guides/using-multiple-parties-per-project/)
- [PartyKit Storage](https://docs.partykit.io/guides/persisting-state-into-storage/)
- [PartyKit Alarms](https://docs.partykit.io/guides/scheduling-tasks-with-alarms/)
- [Multiplayer Lobby Best Practices](https://heroiclabs.com/docs/nakama/guides/concepts/lobby/)

---

## ⚠️ Notes importantes

1. **Migration incrémentale** : Chaque phase est testable indépendamment
2. **Pas de breaking changes** : Le jeu continue de fonctionner à chaque étape
3. **Firestore conservé** : Uniquement pour auth, universes, works, songs
4. **Backward compatible** : Rollback possible à tout moment
5. **Performance** : Latence divisée par 5+ pour la liste des rooms

---

**Prêt pour la phase 1 !** 🚀
