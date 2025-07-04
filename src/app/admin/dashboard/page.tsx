"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FaPlus } from "react-icons/fa";
import { Song, Universe, Work } from "../../../../types";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { SongForm } from "../../../components/admin/SongForm";
import { UniverseForm } from "../../../components/admin/UniverseForm";
import { WorkForm } from "../../../components/admin/WorkForm";
import { Button } from "../../../components/ui/Button";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { useAdmin } from "../../../hooks/useAdmin";
import { useAuth } from "../../../hooks/useAuth";

type ModalType = "universe" | "work" | "song" | null;

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const {
    universes,
    works,
    songs,
    loading,
    error,
    success,
    isAdmin,
    clearMessages,
    loadUniverses,
    addUniverse,
    updateUniverse,
    loadWorks,
    addWork,
    updateWork,
    loadSongs,
    addSong,
    updateSong,
    deleteSong,
    importSongsFromPlaylist,
  } = useAdmin(user);

  // État local pour les modales et formulaires
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<Universe | Work | Song | null>(
    null
  );
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);

  // Redirection si non admin
  if (!isAdmin && user) {
    router.push("/");
    return null;
  }

  // État de chargement initial
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner message="Vérification des droits..." />
      </div>
    );
  }

  // Gestionnaires d'événements
  const handleLogout = async () => {
    await logout();
    router.push("/admin");
  };

  const handleNavigateHome = () => {
    router.push("/");
  };

  const handleOpenModal = (type: ModalType, item?: any) => {
    setActiveModal(type);
    setEditingItem(item || null);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setEditingItem(null);
  };

  const handleUniverseSubmit = async (
    data: Omit<Universe, "id" | "createdAt">
  ) => {
    const result = editingItem
      ? await updateUniverse(editingItem.id, data)
      : await addUniverse(data);

    if (result.success) {
      handleCloseModal();
    }
    return result;
  };

  const handleWorkSubmit = async (data: Omit<Work, "id" | "createdAt">) => {
    const result = editingItem
      ? await updateWork(editingItem.id, data)
      : await addWork(data);

    if (result.success) {
      handleCloseModal();
    }
    return result;
  };

  const handleSongSubmit = async (data: Omit<Song, "id" | "createdAt">) => {
    const result = editingItem
      ? await updateSong(editingItem.id, data)
      : await addSong(data);

    if (result.success) {
      handleCloseModal();
    }
    return result;
  };

  // Configuration des colonnes pour les tableaux
  const universeColumns = [
    {
      key: "icon" as keyof Universe,
      label: "Icône",
      render: (value: string) => <span className="text-2xl">{value}</span>,
    },
    { key: "name" as keyof Universe, label: "Nom" },
    { key: "description" as keyof Universe, label: "Description" },
    {
      key: "color" as keyof Universe,
      label: "Couleur",
      render: (value: string) => (
        <div className="flex items-center space-x-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: value }}
          ></div>
          <span>{value}</span>
        </div>
      ),
    },
    {
      key: "active" as keyof Universe,
      label: "Actif",
      render: (value: boolean) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            value ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {value ? "Actif" : "Inactif"}
        </span>
      ),
    },
  ];

  const workColumns = [
    { key: "title" as keyof Work, label: "Titre" },
    {
      key: "playlistId" as keyof Work,
      label: "Playlist ID",
      render: (value: string) => value || "Non définie",
    },
  ];

  const songColumns = [
    { key: "title" as keyof Song, label: "Titre" },
    { key: "artist" as keyof Song, label: "Artiste" },
    { key: "youtubeId" as keyof Song, label: "YouTube ID" },
    {
      key: "duration" as keyof Song,
      label: "Durée",
      render: (value: number) => {
        const minutes = Math.floor(value / 60);
        const seconds = value % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
      },
    },
  ];

  return (
    <AdminLayout
      user={user}
      title="Administration - Blind Test"
      loading={loading}
      error={error}
      success={success}
      onLogout={handleLogout}
      onClearMessages={clearMessages}
      onNavigateHome={handleNavigateHome}
    >
      <div className="space-y-8">
        {/* Section Univers */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Univers</h2>
            <Button
              variant="primary"
              onClick={() => handleOpenModal("universe")}
              className="flex items-center space-x-2"
            >
              <FaPlus />
              <span>Nouveau</span>
            </Button>
          </div>

          <DataTable
            data={universes}
            columns={universeColumns}
            loading={loading}
            emptyMessage="Aucun univers créé"
            onEdit={(universe) => handleOpenModal("universe", universe)}
            actions={(universe) => (
              <Button
                variant="secondary"
                size="small"
                onClick={() => {
                  setSelectedUniverse(universe.id);
                  loadWorks(universe.id);
                }}
              >
                Gérer les œuvres
              </Button>
            )}
          />
        </section>

        {/* Section Œuvres */}
        {selectedUniverse && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                Œuvres -{" "}
                {universes.find((u) => u.id === selectedUniverse)?.name}
              </h2>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedUniverse(null)}
                >
                  Retour aux univers
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleOpenModal("work")}
                  className="flex items-center space-x-2"
                >
                  <FaPlus />
                  <span>Nouvelle œuvre</span>
                </Button>
              </div>
            </div>

            <DataTable
              data={works}
              columns={workColumns}
              loading={loading}
              emptyMessage="Aucune œuvre créée"
              onEdit={(work) => handleOpenModal("work", work)}
              actions={(work) => (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setSelectedWork(work.id);
                    loadSongs(work.id);
                  }}
                >
                  Gérer les chansons
                </Button>
              )}
            />
          </section>
        )}

        {/* Section Chansons */}
        {selectedWork && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">
                Chansons - {works.find((w) => w.id === selectedWork)?.title}
              </h2>
              <div className="flex space-x-2">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedWork(null)}
                >
                  Retour aux œuvres
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleOpenModal("song")}
                  className="flex items-center space-x-2"
                >
                  <FaPlus />
                  <span>Nouvelle chanson</span>
                </Button>
              </div>
            </div>

            <DataTable
              data={songs}
              columns={songColumns}
              loading={loading}
              emptyMessage="Aucune chanson créée"
              onEdit={(song) => handleOpenModal("song", song)}
              onDelete={(song) => deleteSong(song.id)}
            />
          </section>
        )}
      </div>

      {/* Modales */}
      {activeModal === "universe" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingItem ? "Modifier l'univers" : "Créer un nouvel univers"}
            </h3>
            <UniverseForm
              universe={editingItem as Universe}
              onSubmit={handleUniverseSubmit}
              onCancel={handleCloseModal}
              loading={loading}
            />
          </div>
        </div>
      )}

      {activeModal === "work" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingItem ? "Modifier l'œuvre" : "Créer une nouvelle œuvre"}
            </h3>
            <WorkForm
              work={editingItem as Work}
              universes={universes}
              onSubmit={handleWorkSubmit}
              onCancel={handleCloseModal}
              loading={loading}
              onImportSongs={importSongsFromPlaylist}
            />
          </div>
        </div>
      )}

      {activeModal === "song" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingItem
                ? "Modifier la chanson"
                : "Créer une nouvelle chanson"}
            </h3>
            <SongForm
              song={editingItem as Song}
              works={works}
              onSubmit={handleSongSubmit}
              onCancel={handleCloseModal}
              loading={loading}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
