import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  DocumentData,
  DocumentReference,
  DocumentSnapshot,
  getDoc,
  getDocs,
  query,
  QueryConstraint,
  updateDoc,
} from "firebase/firestore";
import type { z } from "zod";
import { db } from "@/lib/firebase";

export type ServiceResponse<T = void> = {
  success: boolean;
  data?: T;
  error?: string;
};

export const formatError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

const normalizeTimestamp = (value: unknown) => {
  if (value && typeof value === "object" && "toDate" in (value as Record<string, unknown>)) {
    const timestamp = value as { toDate?: () => Date };
    if (typeof timestamp.toDate === "function") {
      try {
        return timestamp.toDate();
      } catch {
        return value;
      }
    }
  }

  return value;
};

const normalizeTimestampFields = (record: Record<string, unknown>, fields: string[]) => {
  fields.forEach((field) => {
    if (record[field]) {
      record[field] = normalizeTimestamp(record[field]);
    }
  });
};

const parseSnapshot = <T>(
  snapshot: DocumentSnapshot<DocumentData>,
  schema?: z.ZodSchema<T>
): T => {
  const raw = {
    id: snapshot.id,
    ...snapshot.data(),
  } as Record<string, unknown>;

  normalizeTimestampFields(raw, ["createdAt", "answeredAt"]);

  return schema ? schema.parse(raw) : (raw as T);
};

export const createDocument = async <T extends Record<string, unknown>>(
  collectionName: string,
  data: T
) => {
  const docRef = await addDoc(collection(db, collectionName), data);
  return docRef.id;
};

export const updateDocument = async <T extends Record<string, unknown>>(
  collectionName: string,
  id: string,
  data: Partial<T>
) => {
  const docRef = doc(db, collectionName, id) as DocumentReference<DocumentData>;
  await updateDoc(docRef, data as unknown as DocumentData);
};

export const removeDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
};

export const fetchDocument = async <T>(
  collectionName: string,
  id: string,
  schema?: z.ZodSchema<T>
): Promise<T> => {
  const docRef = doc(db, collectionName, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) {
    throw new Error("Document introuvable");
  }

  return parseSnapshot<T>(snapshot, schema);
};

export const fetchDocuments = async <T>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  schema?: z.ZodSchema<T>
): Promise<T[]> => {
  const collectionRef = collection(db, collectionName);
  const baseQuery = constraints.length
    ? query(collectionRef, ...constraints)
    : collectionRef;
  const snapshots = await getDocs(baseQuery);

  return snapshots.docs.map((docSnapshot) => parseSnapshot<T>(docSnapshot, schema));
};
