"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Song, Universe, Work } from "@/types";
import { AdminLayout } from "../../../components/admin/AdminLayout";
import { DataTable } from "../../../components/admin/DataTable";
import { SongForm } from "../../../components/admin/SongForm";
import { UniverseForm } from "../../../components/admin/UniverseForm";
import { WorkForm } from "../../../components/admin/WorkForm";
import { WorksTable } from "../../../components/admin/WorksTable";
import { Button } from "../../../components/ui/Button";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { useAdmin } from "../../../hooks/useAdmin";
import { useAuth } from "../../../hooks/useAuth";
import { getIconById } from "@/constants/icons";

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
    addUniverse,
    updateUniverse,
    deleteUniverse,
    loadWorks,
    addWork,
    updateWork,
    deleteWork,
    reorderWorks,
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

  // État pour les modales de confirmation
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "universe" | "work" | "song" | null;
    item: Universe | Work | Song | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    item: null,
    title: "",
    message: "",
  });

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

  const handleOpenModal = (type: ModalType, item?: Universe | Work | Song) => {
    setActiveModal(type);
    setEditingItem(item || null);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setEditingItem(null);
  };

  // Gestionnaires de confirmation de suppression
  const handleConfirmDelete = (
    type: "universe" | "work" | "song",
    item: Universe | Work | Song
  ) => {
    let title = "";
    let message = "";

    switch (type) {
      case "universe":
        const universe = item as Universe;
        title = "Supprimer l'univers";
        message = `Êtes-vous sûr de vouloir supprimer l'univers "${universe.name}" ? Cette action supprimera également toutes les œuvres et chansons associées. Cette action est irréversible.`;
        break;
      case "work":
        const work = item as Work;
        title = "Supprimer l'œuvre";
        message = `Êtes-vous sûr de vouloir supprimer l'œuvre "${work.title}" ? Cette action supprimera également toutes les chansons associées. Cette action est irréversible.`;
        break;
      case "song":
        const song = item as Song;
        title = "Supprimer la chanson";
        message = `Êtes-vous sûr de vouloir supprimer la chanson "${song.title}" ? Cette action est irréversible.`;
        break;
    }

    setConfirmModal({
      isOpen: true,
      type,
      item,
      title,
      message,
    });
  };

  const handleCancelDelete = () => {
    setConfirmModal({
      isOpen: false,
      type: null,
      item: null,
      title: "",
      message: "",
    });
  };

  const handleExecuteDelete = async () => {
    if (!confirmModal.item || !confirmModal.type) return;

    try {
      switch (confirmModal.type) {
        case "universe":
          await deleteUniverse(confirmModal.item.id);
          break;
        case "work":
          await deleteWork(confirmModal.item.id);
          break;
        case "song":
          await deleteSong(confirmModal.item.id);
          break;
      }
    } finally {
      handleCancelDelete();
    }
  };

  const handleUniverseSubmit = async (
    data: Omit<Universe, "id" | "createdAt">
  ) => {
    if (editingItem) {
      await updateUniverse(editingItem.id, data);
    } else {
      await addUniverse(data);
    }
    handleCloseModal();
  };

  const handleWorkSubmit = async (
    data: Omit<Work, "id" | "createdAt" | "order">
  ) => {
    // Calculer l'ordre selon le contexte
    let calculatedOrder = 0;

    if (!editingItem) {
      // Pour les nouvelles œuvres, calculer l'ordre automatiquement
      const currentWorks = works.filter(
        (w) => w.universeId === data.universeId
      );
      const maxOrder =
        currentWorks.length > 0
          ? Math.max(...currentWorks.map((w) => w.order || 0))
          : 0;
      calculatedOrder = maxOrder + 1;
    } else {
      // Pour les modifications, garder l'ordre existant
      calculatedOrder = (editingItem as Work).order || 0;
    }

    const workData: Omit<Work, "id" | "createdAt"> = {
      ...data,
      order: calculatedOrder,
    };

    const result = editingItem
      ? await updateWork(editingItem.id, workData)
      : await addWork(workData);

    if (result.success) {
      handleCloseModal();
    }

    return {
      success: result.success,
      error: result.error,
      id: ("id" in result
        ? result.id
        : editingItem
        ? editingItem.id
        : undefined) as string | undefined,
    };
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

  // Fonctions de réorganisation des œuvres
  const handleMoveWorkUp = async (work: Work) => {
    const currentWorks = works.filter((w) => w.universeId === work.universeId);
    const sortedWorks = currentWorks.sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    const currentIndex = sortedWorks.findIndex((w) => w.id === work.id);

    if (currentIndex > 0) {
      const workToUpdate = sortedWorks[currentIndex];
      const workAbove = sortedWorks[currentIndex - 1];

      const reorderData = [
        { id: workToUpdate.id, order: workAbove.order || 0 },
        { id: workAbove.id, order: workToUpdate.order || 0 },
      ];

      await reorderWorks(reorderData);
    }
  };

  const handleMoveWorkDown = async (work: Work) => {
    const currentWorks = works.filter((w) => w.universeId === work.universeId);
    const sortedWorks = currentWorks.sort(
      (a, b) => (a.order || 0) - (b.order || 0)
    );
    const currentIndex = sortedWorks.findIndex((w) => w.id === work.id);

    if (currentIndex < sortedWorks.length - 1) {
      const workToUpdate = sortedWorks[currentIndex];
      const workBelow = sortedWorks[currentIndex + 1];

      const reorderData = [
        { id: workToUpdate.id, order: workBelow.order || 0 },
        { id: workBelow.id, order: workToUpdate.order || 0 },
      ];

      await reorderWorks(reorderData);
    }
  };

  // Configuration des colonnes pour les tableaux
  const universeColumns = [
    { key: "name" as keyof Universe, label: "Nom" },
    { key: "description" as keyof Universe, label: "Description" },
    {
      key: "color" as keyof Universe,
      label: "Thème",
      render: (value: unknown, universe: Universe) => {
        const colorValue = String(value);
        // Toutes les couleurs doivent être en format hex
        const color = colorValue.startsWith("#") ? colorValue : "#3B82F6";
        const iconData = getIconById(universe.icon) || getIconById("wand");
        const IconComponent = iconData?.component;

        return (
          <div className="flex items-center space-x-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              {IconComponent && (
                <IconComponent className="text-sm text-[#1c1c35]" />
              )}
            </div>
            <div>
              <div className="text-white font-medium">
                {universe.name || "Couleur personnalisée"}
              </div>
              <div className="text-gray-400 text-xs">{color}</div>
              {!colorValue.startsWith("#") && (
                <div className="text-red-400 text-xs">⚠️ Format invalide</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "active" as keyof Universe,
      label: "Actif",
      render: (value: unknown) => (
        <span
          className={`px-2 py-1 rounded text-xs ${
            Boolean(value) ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {Boolean(value) ? "Actif" : "Inactif"}
        </span>
      ),
    },
  ];

  const songColumns = [
    { key: "title" as keyof Song, label: "Titre" },
    { key: "artist" as keyof Song, label: "Artiste" },
    { key: "youtubeId" as keyof Song, label: "YouTube ID" },
    {
      key: "duration" as keyof Song,
      label: "Durée",
      render: (value: unknown) => {
        const duration = Number(value) || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
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
              <Plus className="w-4 h-4" />
              <span>Nouveau</span>
            </Button>
          </div>

          <DataTable
            data={universes}
            columns={universeColumns}
            loading={loading}
            emptyMessage="Aucun univers créé"
            onEdit={(universe) => handleOpenModal("universe", universe)}
            onDelete={(universe) => handleConfirmDelete("universe", universe)}
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
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle œuvre</span>
                </Button>
              </div>
            </div>

            <WorksTable
              works={works}
              loading={loading}
              onEdit={(work) => handleOpenModal("work", work)}
              onDelete={(work) => handleConfirmDelete("work", work)}
              onManageSongs={(work) => {
                setSelectedWork(work.id);
                loadSongs(work.id);
              }}
              onMoveUp={handleMoveWorkUp}
              onMoveDown={handleMoveWorkDown}
              onReorder={reorderWorks}
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
                  <Plus className="w-4 h-4" />
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
              onDelete={(song) => handleConfirmDelete("song", song)}
            />
          </section>
        )}
      </div>

      {/* Modales de formulaires */}
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
              defaultUniverseId={
                !editingItem ? selectedUniverse || undefined : undefined
              }
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

      {/* Modale de confirmation de suppression */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Supprimer"
        onConfirm={handleExecuteDelete}
        onCancel={handleCancelDelete}
        loading={loading}
        variant="danger"
      />
    </AdminLayout>
  );
}

