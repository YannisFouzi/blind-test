import { useCallback, useEffect, useState } from "react";
import { generateId } from "@/utils/formatters";

const ID_STORAGE_KEY = "blindtest_playerId";
const NAME_STORAGE_KEY = "blindtest_displayName";

type Identity = {
  playerId: string | null;
  displayName: string;
  ready: boolean;
  setIdentity: (patch: Partial<{ playerId: string; displayName: string }>) => void;
};

const ensurePlayerId = (storedId: string | null) => {
  if (storedId) {
    return storedId;
  }

  const fresh = generateId();
  window.localStorage.setItem(ID_STORAGE_KEY, fresh);
  return fresh;
};

export function useIdentity(): Identity {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedId = window.localStorage.getItem(ID_STORAGE_KEY);
    const storedName = window.localStorage.getItem(NAME_STORAGE_KEY);

    const id = ensurePlayerId(storedId);
    setPlayerId(id);
    setDisplayName(storedName ?? "");
  }, []);

  const setIdentity = useCallback(
    (patch: Partial<{ playerId: string; displayName: string }>) => {
      if (typeof window === "undefined") return;

      if (patch.playerId) {
        setPlayerId(patch.playerId);
        window.localStorage.setItem(ID_STORAGE_KEY, patch.playerId);
      }
      if (patch.displayName) {
        setDisplayName(patch.displayName);
        window.localStorage.setItem(NAME_STORAGE_KEY, patch.displayName);
      }
    },
    []
  );

  return {
    playerId,
    displayName,
    ready: Boolean(playerId),
    setIdentity,
  };
}
