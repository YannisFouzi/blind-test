import "server-only";

import { unstable_cache } from "next/cache";
import type { Universe } from "@/types";
import { UniverseSchema } from "@/types";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION = "universes";

const fetchActiveUniverses = async (): Promise<Universe[]> => {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where("active", "==", true)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) =>
    UniverseSchema.parse({
      id: doc.id,
      ...doc.data(),
    })
  );
};

export const getActiveUniversesServer = unstable_cache(
  fetchActiveUniverses,
  ["active-universes"],
  { revalidate: 300 }
);
