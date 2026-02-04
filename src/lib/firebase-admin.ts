import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

console.log("[firebase-admin] Checking credentials...");
console.log("[firebase-admin] projectId:", projectId ? "✅ EXISTS" : "❌ MISSING");
console.log("[firebase-admin] clientEmail:", clientEmail ? "✅ EXISTS" : "❌ MISSING");
console.log("[firebase-admin] privateKey:", privateKey ? `✅ EXISTS (${privateKey.length} chars)` : "❌ MISSING");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
  );
}

console.log("[firebase-admin] privateKey starts with:", privateKey.substring(0, 30));
console.log("[firebase-admin] privateKey ends with:", privateKey.substring(privateKey.length - 30));
console.log("[firebase-admin] privateKey contains real newlines?", privateKey.includes("\n") ? "✅ YES" : "❌ NO (problem!)");

let app;

try {
  console.log("[firebase-admin] Attempting to initialize Firebase Admin...");

  app =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });

  console.log("[firebase-admin] ✅ Firebase Admin initialized successfully");
} catch (error) {
  console.error("[firebase-admin] ❌ Failed to initialize:", error);
  throw error;
}

export const adminDb = getFirestore(app);
