"use client";

import { signOut } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaDownload,
  FaEdit,
  FaHome,
  FaMusic,
  FaPlus,
  FaSignOutAlt,
  FaTrash,
  FaYoutube,
} from "react-icons/fa";
import { ADMIN_EMAIL, auth, db } from "../../../../lib/firebase";
import { getPlaylistVideos, validatePlaylist } from "../../../../lib/youtube";
import { Universe, User, Work } from "../../../../types";

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [universes, setUniverses] = useState<Universe[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null);
  const [showUniverseModal, setShowUniverseModal] = useState(false);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [editingUniverse, setEditingUniverse] = useState<Universe | null>(null);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [songCounts, setSongCounts] = useState<{ [workId: string]: number }>(
    {}
  );
  const router = useRouter();

  // Données du formulaire univers
  const [universeForm, setUniverseForm] = useState({
    name: "",
    description: "",
    color: "from-blue-600 to-blue-800",
    icon: "🎵",
    active: true,
  });

  // Données du formulaire œuvre
  const [workForm, setWorkForm] = useState({
    title: "",
    playlistId: "",
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // Vérifier si l'utilisateur est admin via l'email
        const isAdmin = firebaseUser.email === ADMIN_EMAIL;

        if (isAdmin) {
          const user: User = {
            uid: firebaseUser.uid,
            email: firebaseUser.email!,
            displayName: firebaseUser.displayName!,
            photoURL: firebaseUser.photoURL || undefined,
            isAdmin: true,
          };
          setUser(user);
          loadUniverses();
        } else {
          router.push("/admin");
        }
      } else {
        router.push("/admin");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadUniverses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "universes"));
      const fetchedUniverses = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Universe[];
      setUniverses(fetchedUniverses);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors du chargement des univers:", error);
      }
    }
  };

  const loadWorks = async (universeId: string) => {
    try {
      const querySnapshot = await getDocs(collection(db, "works"));
      const fetchedWorks = querySnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))
        .filter((work: any) => work.universeId === universeId) as Work[];
      setWorks(fetchedWorks);

      // Charger les compteurs de chansons pour toutes les œuvres
      if (fetchedWorks.length > 0) {
        loadSongCounts(fetchedWorks);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors du chargement des œuvres:", error);
      }
    }
  };

  const loadSongCounts = async (works: Work[]) => {
    try {
      const counts: { [workId: string]: number } = {};

      for (const work of works) {
        const songsQuery = query(
          collection(db, "songs"),
          where("workId", "==", work.id)
        );
        const songsSnapshot = await getDocs(songsQuery);
        counts[work.id] = songsSnapshot.size;
      }

      setSongCounts(counts);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors du comptage des chansons:", error);
      }
    }
  };

  const handleUniverseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUniverse) {
        // Modification - inclure le statut active
        await updateDoc(doc(db, "universes", editingUniverse.id), {
          ...universeForm,
          updatedAt: new Date(),
        });
      } else {
        // Création - ajouter active: true par défaut
        await addDoc(collection(db, "universes"), {
          ...universeForm,
          active: true, // Actif par défaut
          createdAt: new Date(),
        });
      }

      setShowUniverseModal(false);
      setEditingUniverse(null);
      setUniverseForm({
        name: "",
        description: "",
        color: "from-blue-600 to-blue-800",
        icon: "🎵",
        active: true,
      });
      loadUniverses();
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors de la sauvegarde de l'univers:", error);
      }
    }
  };

  const handleWorkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUniverse) return;

    try {
      if (editingWork) {
        // Modification
        await updateDoc(doc(db, "works", editingWork.id), {
          ...workForm,
          universeId: selectedUniverse,
          updatedAt: new Date(),
        });
      } else {
        // Création
        await addDoc(collection(db, "works"), {
          ...workForm,
          universeId: selectedUniverse,
          createdAt: new Date(),
        });
      }

      setShowWorkModal(false);
      setEditingWork(null);
      setWorkForm({ title: "", playlistId: "" });
      loadWorks(selectedUniverse);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors de la sauvegarde de l'œuvre:", error);
      }
    }
  };

  const handleDeleteUniverse = async (universeId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cet univers ?")) return;

    try {
      await deleteDoc(doc(db, "universes", universeId));
      loadUniverses();
      if (selectedUniverse === universeId) {
        setSelectedUniverse(null);
        setWorks([]);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors de la suppression de l'univers:", error);
      }
    }
  };

  const handleDeleteWork = async (workId: string) => {
    if (
      !confirm(
        "Êtes-vous sûr de vouloir supprimer cette œuvre et toutes ses chansons ?"
      )
    )
      return;

    try {
      // Supprimer d'abord toutes les chansons associées à cette œuvre
      const songsQuery = query(
        collection(db, "songs"),
        where("workId", "==", workId)
      );
      const songsSnapshot = await getDocs(songsQuery);
      const deleteSongsPromises = songsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deleteSongsPromises);

      // Puis supprimer l'œuvre elle-même
      await deleteDoc(doc(db, "works", workId));

      // Mettre à jour les compteurs
      setSongCounts((prev) => {
        const newCounts = { ...prev };
        delete newCounts[workId];
        return newCounts;
      });

      if (selectedUniverse) {
        loadWorks(selectedUniverse);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors de la suppression de l'œuvre:", error);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/admin");
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur de déconnexion:", error);
      }
    }
  };

  const testPlaylist = async (playlistId: string) => {
    try {
      const result = await validatePlaylist(playlistId);
      if (result.exists) {
        alert(`Playlist valide ! ${result.itemCount || 0} vidéos trouvées.`);
      } else {
        alert(`Playlist inaccessible : ${result.error || "Erreur inconnue"}`);
      }
    } catch (error) {
      alert("Erreur lors de la vérification de la playlist.");
    }
  };

  const importSongsFromPlaylist = async (work: Work) => {
    try {
      const videos = await getPlaylistVideos(work.playlistId);

      // Créer les chansons dans Firebase
      const songsToAdd = videos.map((video) => ({
        title: video.title,
        artist: "Artiste inconnu", // Extrait de la description si possible
        workId: work.id,
        youtubeId: video.id,
        duration: 180, // durée par défaut en secondes
        createdAt: new Date(),
      }));

      // Ajouter toutes les chansons à Firebase
      const songsCollection = collection(db, "songs");
      const promises = songsToAdd.map((song) => addDoc(songsCollection, song));
      await Promise.all(promises);

      alert(`${videos.length} chansons importées avec succès !`);

      // Mettre à jour le compteur pour cette œuvre
      setSongCounts((prev) => ({
        ...prev,
        [work.id]: videos.length,
      }));
    } catch (error) {
      console.error("Erreur lors de l'import des chansons:", error);
      alert("Erreur lors de l'import des chansons");
    }
  };

  const deleteSongsFromWork = async (work: Work) => {
    if (
      !confirm(
        `Êtes-vous sûr de vouloir supprimer toutes les chansons de "${work.title}" ?`
      )
    ) {
      return;
    }

    try {
      // Récupérer toutes les chansons de cette œuvre
      const songsQuery = query(
        collection(db, "songs"),
        where("workId", "==", work.id)
      );
      const songsSnapshot = await getDocs(songsQuery);

      // Supprimer toutes les chansons
      const deletePromises = songsSnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      alert(`${songsSnapshot.size} chansons supprimées avec succès !`);

      // Mettre à jour le compteur pour cette œuvre
      setSongCounts((prev) => ({
        ...prev,
        [work.id]: 0,
      }));
    } catch (error) {
      console.error("Erreur lors de la suppression des chansons:", error);
      alert("Erreur lors de la suppression des chansons");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-400">
            Dashboard Admin
          </h1>
          {user && (
            <div className="flex items-center gap-2 text-white">
              <img
                src={user.photoURL || ""}
                alt={user.displayName}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-sm">{user.displayName}</span>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-white hover:text-yellow-400 transition-colors"
          >
            <FaHome size={16} />
            <span>Blind Test</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
          >
            <FaSignOutAlt size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gestion des univers */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Univers</h2>
            <button
              onClick={() => {
                setEditingUniverse(null);
                setUniverseForm({
                  name: "",
                  description: "",
                  color: "from-blue-600 to-blue-800",
                  icon: "🎵",
                  active: true,
                });
                setShowUniverseModal(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <FaPlus size={14} />
              Ajouter
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {universes.map((universe) => (
              <div
                key={universe.id}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${
                    selectedUniverse === universe.id
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                  }
                `}
                onClick={() => {
                  setSelectedUniverse(universe.id);
                  loadWorks(universe.id);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{universe.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold">
                          {universe.name}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            universe.active !== false
                              ? "bg-green-900/50 text-green-400 border border-green-600"
                              : "bg-red-900/50 text-red-400 border border-red-600"
                          }`}
                        >
                          {universe.active !== false ? "ACTIF" : "INACTIF"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm">
                        {universe.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingUniverse(universe);
                        setUniverseForm({
                          name: universe.name,
                          description: universe.description,
                          color: universe.color,
                          icon: universe.icon,
                          active: universe.active ?? true,
                        });
                        setShowUniverseModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <FaEdit size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteUniverse(universe.id);
                      }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gestion des œuvres */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-gray-700/50">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">
              Œuvres{" "}
              {selectedUniverse &&
                `(${universes.find((u) => u.id === selectedUniverse)?.name})`}
            </h2>
            <button
              onClick={() => {
                if (!selectedUniverse) {
                  alert("Veuillez d'abord sélectionner un univers");
                  return;
                }
                setEditingWork(null);
                setWorkForm({ title: "", playlistId: "" });
                setShowWorkModal(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              disabled={!selectedUniverse}
            >
              <FaPlus size={14} />
              Ajouter
            </button>
          </div>

          {!selectedUniverse ? (
            <div className="text-center text-gray-400 py-12">
              <FaMusic size={48} className="mx-auto mb-4 opacity-50" />
              <p>Sélectionnez un univers pour voir ses œuvres</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="p-4 rounded-lg border border-gray-600 bg-gray-700/30"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-semibold">{work.title}</h3>
                      <p className="text-gray-400 text-sm">
                        Playlist: {work.playlistId}
                      </p>
                      {songCounts[work.id] > 0 && (
                        <p className="text-green-400 text-sm font-medium">
                          ✓ {songCounts[work.id]} chansons importées
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testPlaylist(work.playlistId)}
                        className="text-green-400 hover:text-green-300 transition-colors"
                        title="Tester la playlist"
                      >
                        <FaYoutube size={14} />
                      </button>

                      {/* Bouton toggle Import/Suppression */}
                      {songCounts[work.id] > 0 ? (
                        <button
                          onClick={() => deleteSongsFromWork(work)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title={`Supprimer les ${
                            songCounts[work.id]
                          } chansons importées`}
                        >
                          <FaTrash size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={() => importSongsFromPlaylist(work)}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                          title="Importer les chansons depuis la playlist"
                        >
                          <FaDownload size={14} />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setEditingWork(work);
                          setWorkForm({
                            title: work.title,
                            playlistId: work.playlistId,
                          });
                          setShowWorkModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteWork(work.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Supprimer l'œuvre complète"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Univers */}
      {showUniverseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingUniverse ? "Modifier l'univers" : "Nouvel univers"}
            </h3>

            <form onSubmit={handleUniverseSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Nom de l'univers
                </label>
                <input
                  type="text"
                  value={universeForm.name}
                  onChange={(e) =>
                    setUniverseForm({ ...universeForm, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={universeForm.description}
                  onChange={(e) =>
                    setUniverseForm({
                      ...universeForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Icône (emoji)
                </label>
                <input
                  type="text"
                  value={universeForm.icon}
                  onChange={(e) =>
                    setUniverseForm({ ...universeForm, icon: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="🎵"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Couleur du gradient
                </label>
                <select
                  value={universeForm.color}
                  onChange={(e) =>
                    setUniverseForm({ ...universeForm, color: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="from-blue-600 to-blue-800">Bleu</option>
                  <option value="from-green-600 to-green-800">Vert</option>
                  <option value="from-red-600 to-red-800">Rouge</option>
                  <option value="from-purple-600 to-purple-800">Violet</option>
                  <option value="from-yellow-600 to-yellow-800">Jaune</option>
                  <option value="from-pink-600 to-pink-800">Rose</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-3 text-gray-300 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={universeForm.active}
                    onChange={(e) =>
                      setUniverseForm({
                        ...universeForm,
                        active: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <span>Univers actif (visible sur la page d'accueil)</span>
                </label>
                <p className="text-gray-400 text-xs mt-1">
                  Seuls les univers actifs sont visibles par les joueurs
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {editingUniverse ? "Modifier" : "Créer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUniverseModal(false);
                    setEditingUniverse(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Œuvre */}
      {showWorkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingWork ? "Modifier l'œuvre" : "Nouvelle œuvre"}
            </h3>

            <form onSubmit={handleWorkSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Titre de l'œuvre
                </label>
                <input
                  type="text"
                  value={workForm.title}
                  onChange={(e) =>
                    setWorkForm({ ...workForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ex: Harry Potter à l'École des Sorciers"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  ID de la playlist YouTube
                </label>
                <input
                  type="text"
                  value={workForm.playlistId}
                  onChange={(e) =>
                    setWorkForm({ ...workForm, playlistId: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="PLxxxxxxxxxxxxxxxxxx"
                  required
                />
                <p className="text-gray-400 text-xs mt-1">
                  L'ID se trouve dans l'URL de la playlist YouTube après "list="
                </p>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  {editingWork ? "Modifier" : "Créer"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowWorkModal(false);
                    setEditingWork(null);
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
