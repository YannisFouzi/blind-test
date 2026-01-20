"use client";

import { RoomsBrowser } from "@/components/home/RoomsBrowser";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Page Lobby PartyKit
 *
 * Alternative moderne à HomeContent.tsx utilisant 100% PartyKit
 * - Affiche les rooms disponibles en temps réel
 * - Création de room instantanée
 * - Nettoyage automatique des rooms vides
 *
 * Route: /lobby
 */
export default function LobbyPage() {
  const [universeId, setUniverseId] = useState<string>("");

  useEffect(() => {
    // Récupérer l'universeId par défaut depuis le localStorage ou utiliser celui par défaut
    const defaultUniverseId = localStorage.getItem("selectedUniverseId") || "P3iE45PQXeqT5h2uUAzc";
    setUniverseId(defaultUniverseId);
  }, []);

  // Attendre que l'universeId soit chargé
  if (!universeId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            🎵 Blind Test Lobby
          </h1>
          <p className="text-xl text-blue-200">
            Parties en temps réel avec PartyKit
          </p>
          <p className="text-sm text-blue-300 mt-2">
            ⚡ Synchronisation instantanée • 🧹 Nettoyage automatique
          </p>
        </div>

        {/* Carte du lobby */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
          <RoomsBrowser universeId={universeId} />
        </div>

        {/* Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-blue-200">
            💡 Les rooms se nettoient automatiquement quand elles sont vides
          </p>
          <Link
            href="/"
            className="inline-block mt-4 text-blue-300 hover:text-blue-100 underline transition-colors"
          >
            ← Retour à l&apos;ancienne version (Firebase)
          </Link>
        </div>
      </div>
    </div>
  );
}
