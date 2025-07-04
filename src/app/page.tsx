"use client";

import { collection, getDocs, query, where } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { Universe } from "../../types";

export default function HomePage() {
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUniverses();
  }, []);

  const loadUniverses = async () => {
    try {
      setLoading(true);
      setError(null);

      // CORRECTION: Filtrer seulement les univers actifs (conformément aux règles Firestore)
      const universesQuery = query(
        collection(db, "universes"),
        where("active", "==", true)
      );

      const querySnapshot = await getDocs(universesQuery);

      const fetchedUniverses = querySnapshot.docs.map((doc) => {
        const data = doc.data();

        // Log de debug seulement en développement
        if (process.env.NODE_ENV === "development") {
          console.log("🔍 [DEBUG] Document univers:", {
            id: doc.id,
            name: data.name,
            active: data.active,
            hasAllFields: !!(
              data.name &&
              data.description &&
              data.color &&
              data.icon
            ),
          });
        }

        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        };
      }) as Universe[];

      setUniverses(fetchedUniverses);
    } catch (error: any) {
      // Log d'erreur détaillé seulement en développement
      if (process.env.NODE_ENV === "development") {
        console.error(
          "❌ [DEBUG] Erreur lors du chargement des univers:",
          error
        );
      }

      // Messages d'erreur spécifiques
      if (error.code === "permission-denied") {
        setError("Permissions insuffisantes pour accéder aux univers");
      } else if (error.code === "unavailable") {
        setError("Service Firebase temporairement indisponible");
      } else {
        setError(`Erreur: ${error.message}`);
      }

      setUniverses([]); // État vide en cas d'erreur
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-xl text-white">Chargement des univers...</p>
          <p className="text-sm text-gray-400 mt-2">Connexion à Firebase...</p>
        </div>
      </div>
    );
  }

  // Affichage d'erreur si problème de permissions
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center px-8">
          <div className="bg-red-500/20 border border-red-500 rounded-2xl p-12">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Erreur de chargement
            </h2>
            <p className="text-red-300 text-lg mb-8">{error}</p>
            <button
              onClick={loadUniverses}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors mr-4"
            >
              Réessayer
            </button>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              🛠️ Administration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="pt-16 pb-8 text-center">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400 mb-4">
          CHOISISSEZ VOTRE UNIVERS
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto">
          Plongez dans l'univers de votre choix et testez vos connaissances
          musicales
        </p>
      </div>

      {/* Contenu principal */}
      <div className="container mx-auto px-8 pb-16">
        {universes.length === 0 ? (
          /* Message si aucun univers */
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-slate-800/50 rounded-2xl p-12 border border-gray-700/50">
              <div className="text-6xl mb-6">🎵</div>
              <h2 className="text-3xl font-bold text-white mb-4">
                Aucun univers actif
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Aucun univers de blind test n'est actuellement actif. Les
                univers doivent être activés par l'administrateur pour
                apparaître ici.
              </p>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                🛠️ Accès Administration
              </Link>
            </div>
          </div>
        ) : (
          /* Grille des univers */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              {universes.map((universe) => (
                <Link
                  key={universe.id}
                  href={`/game/${universe.id}`}
                  className="group"
                >
                  <div
                    className={`
                      relative overflow-hidden rounded-3xl p-8 h-80 
                      bg-gradient-to-br ${universe.color} 
                      transform transition-all duration-300 ease-out
                      hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25
                      border border-gray-700/50 hover:border-gray-500/50
                      cursor-pointer
                    `}
                  >
                    {/* Icône */}
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-4xl">
                        {universe.icon}
                      </div>
                    </div>

                    {/* Titre */}
                    <h2 className="text-2xl font-bold text-white text-center mb-3">
                      {universe.name}
                    </h2>

                    {/* Description */}
                    <p className="text-white/80 text-center text-sm leading-relaxed mb-4">
                      {universe.description}
                    </p>

                    {/* Bouton */}
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center font-semibold text-white group-hover:bg-white/30 transition-all">
                        JOUER
                      </div>
                    </div>

                    {/* Effet de survol */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl"></div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Lien administration */}
            <div className="text-center mt-12">
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                🛠️ Administration
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
