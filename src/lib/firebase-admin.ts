import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

console.log("[firebase-admin] ========== CHECKING CREDENTIALS ==========");
console.log("[firebase-admin] projectId:", projectId ? "✅ EXISTS" : "❌ MISSING");
console.log("[firebase-admin] clientEmail:", clientEmail ? "✅ EXISTS" : "❌ MISSING");
console.log("[firebase-admin] privateKey:", privateKey ? `✅ EXISTS (${privateKey.length} chars)` : "❌ MISSING");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin credentials. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY."
  );
}

console.log("[firebase-admin] ========== ANALYZING PRIVATE KEY FORMAT ==========");
console.log("[firebase-admin] First 50 chars:", JSON.stringify(privateKey.substring(0, 50)));
console.log("[firebase-admin] Last 50 chars:", JSON.stringify(privateKey.substring(privateKey.length - 50)));
console.log("[firebase-admin] Contains literal backslash-n (\\n)?", privateKey.includes("\\n") ? "✅ YES" : "❌ NO");
console.log("[firebase-admin] Contains real newlines?", privateKey.includes("\n") ? "✅ YES" : "❌ NO");
console.log("[firebase-admin] Contains quotes at start?", privateKey.startsWith('"') ? "✅ YES (PROBLEM!)" : "❌ NO");
console.log("[firebase-admin] Contains quotes at end?", privateKey.endsWith('"') ? "✅ YES (PROBLEM!)" : "❌ NO");

let app;

try {
  console.log("[firebase-admin] ========== INITIALIZING FIREBASE ADMIN ==========");
  console.log("[firebase-admin] Passing to cert():", {
    projectId: projectId ? "✅" : "❌",
    clientEmail: clientEmail ? "✅" : "❌",
    privateKeyLength: privateKey?.length || 0,
  });

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
  console.error("[firebase-admin] ❌ INITIALIZATION FAILED");
  console.error("[firebase-admin] Error name:", error instanceof Error ? error.name : "Unknown");
  console.error("[firebase-admin] Error message:", error instanceof Error ? error.message : String(error));
  console.error("[firebase-admin] Full error:", error);
  throw error;
}

export const adminDb = getFirestore(app);
