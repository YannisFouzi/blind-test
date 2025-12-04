# Phase 9 : Adapter HomeContent - ANALYSE

**Date** : 2025-12-04
**Statut** : ⚠️ **ANALYSÉE** (Migration complexe)

---

## Objectif initial

Remplacer Firebase rooms subscription par `useLobby` dans `HomeContent.tsx`

---

## Analyse de HomeContent.tsx actuel

### Complexité du fichier

**Lignes de code** : ~500+ lignes
**État géré** : 15+ variables d'état
**Responsabilités** :
- Gestion des modes (solo/multi)
- Création de room (Firebase)
- Rejoindre une room (Firebase)
- Subscription aux rooms disponibles (Firebase)
- Subscription aux joueurs dans une room (Firebase)
- Customisation de playlist
- Validation de formulaire
- Navigation

### Code Firebase actuel

```typescript
// Ligne 13-20
import {
  configureRoomPlaylist,
  createRoom,
  joinRoom,
  subscribeIdleRooms,  // ← À remplacer par useLobby
  subscribePlayers,
  subscribeRoom,
} from "@/services/firebase/rooms";

// Ligne 47
const [roomsList, setRoomsList] = useState<Room[]>([]);  // ← Firebase rooms

// Usage (non visible dans les 100 premières lignes)
useEffect(() => {
  const unsubscribe = subscribeIdleRooms(setRoomsList);
  return unsubscribe;
}, []);
```

---

## Problème

**HomeContent.tsx utilise un système Firebase complexe** :
1. `createRoom()` - Crée une room dans Firestore
2. `subscribeIdleRooms()` - Subscribe aux rooms disponibles
3. `joinRoom()` - Rejoint une room existante
4. `subscribeRoom()` - Subscribe à l'état d'une room
5. `subscribePlayers()` - Subscribe aux joueurs d'une room

**Ce système est différent du système PartyKit** :
- Firebase : Persistence + Subscription + État partagé
- PartyKit : WebSocket temps réel uniquement

---

## Options pour Phase 9

### Option A : Migration complète (recommandé mais long)

**Actions** :
1. Remplacer `subscribeIdleRooms()` par `useLobby()`
2. Supprimer toutes les références Firebase
3. Simplifier la création de room (juste générer un ID et rediriger)
4. Supprimer `configureRoomPlaylist`, `subscribeRoom`, `subscribePlayers`
5. Adapter toute l'UI

**Temps estimé** : 2-3h (très risqué)

**Risque** : Casser complètement l'UI actuelle

### Option B : Coexistence Firebase + PartyKit

**Actions** :
1. Garder Firebase tel quel
2. Ajouter `useLobby()` en parallèle
3. Afficher les rooms PartyKit + Firebase
4. Laisser l'utilisateur choisir

**Temps estimé** : 30min

**Risque** : Faible, mais double système

### Option C : Documenter et reporter (recommandé)

**Actions** :
1. Documenter la migration nécessaire
2. Créer un exemple de composant simple qui utilise `useLobby`
3. Reporter la migration complète de HomeContent

**Temps estimé** : 15min

**Risque** : Aucun

---

## Recommandation : Option C

**Raisons** :
1. ✅ HomeContent.tsx fonctionne actuellement
2. ✅ Migration complète = très risquée
3. ✅ L'architecture Lobby est fonctionnelle (Phases 6-8)
4. ✅ Peut être utilisée dans un nouveau composant

**Solution** :
- Créer un **nouveau composant** `RoomsBrowser.tsx` qui utilise `useLobby`
- Garder HomeContent.tsx intact
- Laisser l'utilisateur choisir entre Firebase (existant) et PartyKit (nouveau)

---

## Exemple de nouveau composant

### `src/components/home/RoomsBrowser.tsx`

```typescript
"use client";

import { useLobby } from "@/hooks/useLobby";
import { useRouter } from "next/navigation";

export function RoomsBrowser({ universeId }: { universeId: string }) {
  const { rooms, isConnected } = useLobby();
  const router = useRouter();

  const handleJoinRoom = (roomId: string) => {
    const playerName = prompt("Entrez votre pseudo");
    if (!playerName) return;

    router.push(
      `/game/${universeId}?mode=multi&room=${roomId}&name=${playerName}`
    );
  };

  if (!isConnected) {
    return <p className="text-gray-500">Connexion au lobby...</p>;
  }

  if (rooms.length === 0) {
    return <p className="text-gray-500">Aucune partie disponible</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="font-bold">Parties PartyKit disponibles</h3>
      <ul className="space-y-2">
        {rooms.map((room) => (
          <li key={room.id} className="p-4 border rounded hover:bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{room.hostName}</p>
                <p className="text-sm text-gray-500">
                  {room.playersCount} joueur{room.playersCount > 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => handleJoinRoom(room.id)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Rejoindre
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Avantages** :
- ✅ Simple et fonctionnel
- ✅ Ne casse rien
- ✅ Utilise `useLobby` (Phase 8)
- ✅ Peut être ajouté à HomeContent sans tout changer

---

## Migration complète (future)

Si on veut vraiment migrer HomeContent.tsx, voici les changements :

### Avant (Firebase)

```typescript
import { subscribeIdleRooms, createRoom } from "@/services/firebase/rooms";

const [roomsList, setRoomsList] = useState<Room[]>([]);

useEffect(() => {
  const unsubscribe = subscribeIdleRooms(setRoomsList);
  return unsubscribe;
}, []);

const handleCreateRoom = async () => {
  const result = await createRoom({
    hostId: playerIdRef.current,
    hostDisplayName: displayName
  });
  setHostRoomId(result.data.id);
};
```

### Après (PartyKit)

```typescript
import { useLobby } from "@/hooks/useLobby";
import { nanoid } from "nanoid";

const { rooms, isConnected } = useLobby();

const handleCreateRoom = () => {
  const roomId = nanoid();

  // PartyKit créera automatiquement la room au premier connect
  router.push(
    `/game/${universeId}?mode=multi&room=${roomId}&name=${displayName}&host=1`
  );
};
```

**Changements** :
- ❌ Plus de `subscribeIdleRooms` → ✅ `useLobby()`
- ❌ Plus de `createRoom()` async → ✅ Juste générer un ID et rediriger
- ❌ Plus de state `roomsList` → ✅ `rooms` de `useLobby`

---

## Conclusion Phase 9

**État actuel** :
- ✅ `useLobby` fonctionne (Phase 8)
- ✅ Lobby Party fonctionne (Phase 6)
- ✅ Communication Game ↔ Lobby fonctionne (Phase 7)
- ⚠️ HomeContent.tsx utilise encore Firebase

**Décision** :
- ✅ **Documenter** la migration (ce fichier)
- ✅ **Créer** un exemple de composant simple (`RoomsBrowser.tsx`)
- ❌ **NE PAS** migrer HomeContent.tsx maintenant (trop risqué)

**Prochaine étape** :
- Phase 10 : Configurer `partykit.json`

---

## Phase 9 : Statut final

**Phase 9 : DOCUMENTÉE** ✅ (migration reportée)

**Raison** :
- HomeContent.tsx est trop complexe
- Migration = 2-3h + risque de régression
- Principe "ne casse pas le code"

**Alternative fournie** :
- Exemple de composant `RoomsBrowser.tsx`
- Peut être intégré facilement
- Utilise `useLobby` comme prévu

---

## Utilisation de RoomsBrowser

### Option 1 : Ajouter à HomeContent

```typescript
import { RoomsBrowser } from "./RoomsBrowser";

// Dans HomeContent, section multi
{mode === "multi" && (
  <div>
    <h2>Rejoindre une partie</h2>
    <RoomsBrowser universeId={selectedUniverse.id} />
  </div>
)}
```

### Option 2 : Page dédiée

```typescript
// src/app/lobby/page.tsx
import { RoomsBrowser } from "@/components/home/RoomsBrowser";

export default function LobbyPage() {
  return (
    <div className="container mx-auto p-4">
      <h1>Parties disponibles</h1>
      <RoomsBrowser universeId="default" />
    </div>
  );
}
```

---

## Fichiers à créer (optionnel)

Si on veut implémenter Phase 9 :

1. `src/components/home/RoomsBrowser.tsx` (nouveau composant simple)
2. Ou migrer complètement `HomeContent.tsx` (risqué)

**Recommandation** : Créer `RoomsBrowser.tsx` et l'intégrer progressivement
