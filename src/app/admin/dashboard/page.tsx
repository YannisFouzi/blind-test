"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Song, Universe, Work } from "@/types";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAdmin } from "@/features/admin/hooks/useAdmin";
import { useAuth } from "@/lib/auth/useAuth";

const UniverseSection = dynamic(
  () => import("@/features/admin/components/UniverseSection").then((mod) => mod.UniverseSection),
  { loading: () => <LoadingSpinner size="large" /> }
);

const WorksSection = dynamic(
  () => import("@/features/admin/components/WorksSection").then((mod) => mod.WorksSection),
  { loading: () => <LoadingSpinner size="large" /> }
);

const SongsSection = dynamic(
  () => import("@/features/admin/components/SongsSection").then((mod) => mod.SongsSection),
  { loading: () => <LoadingSpinner size="large" /> }
);

const CookieStatus = dynamic(
  () => import("@/features/admin/components/CookieStatus").then((mod) => mod.CookieStatus),
  { loading: () => <LoadingSpinner size="large" /> }
);

const UniverseForm = dynamic(
  () => import("@/features/admin/components/UniverseForm").then((mod) => mod.UniverseForm),
  { loading: () => <LoadingSpinner size="large" /> }
);

const WorkForm = dynamic(
  () => import("@/features/admin/components/WorkForm").then((mod) => mod.WorkForm),
  { loading: () => <LoadingSpinner size="large" /> }
);

const SongForm = dynamic(
  () => import("@/features/admin/components/SongForm").then((mod) => mod.SongForm),
  { loading: () => <LoadingSpinner size="large" /> }
);

const ConfirmModal = dynamic(
  () => import("@/components/ui/ConfirmModal").then((mod) => mod.ConfirmModal),
  { loading: () => null }
);

type ModalType = "universe" | "work" | "song" | null;

type ConfirmState = {
  isOpen: boolean;
  type: "universe" | "work" | "song" | null;
  item: Universe | Work | Song | null;
  title: string;
  message: string;
};

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
    resumeImportFromJob,
    pendingImportJob,
  } = useAdmin(user);

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [editingItem, setEditingItem] = useState<Universe | Work | Song | null>(null);
  const [selectedUniverse, setSelectedUniverse] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<ConfirmState>({
    isOpen: false,
    type: null,
    item: null,
    title: "",
    message: "",
  });

  if (!isAdmin && user) {
    router.push("/");
    return null;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <LoadingSpinner message="Verification des droits..." />
      </div>
    );
  }

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

  const handleConfirmDelete = (
    type: "universe" | "work" | "song",
    item: Universe | Work | Song
  ) => {
    let title = "";
    let message = "";

    switch (type) {
      case "universe": {
        const universe = item as Universe;
        title = "Supprimer l'univers";
        message = `Etes-vous sur de vouloir supprimer l'univers "${universe.name}" ? Cette action supprimera egalement toutes les oeuvres et chansons associees. Cette action est irreversible.`;
        break;
      }
      case "work": {
        const work = item as Work;
        title = "Supprimer l'oeuvre";
        message = `Etes-vous sur de vouloir supprimer l'oeuvre "${work.title}" ? Cette action supprimera egalement toutes les chansons associees. Cette action est irreversible.`;
        break;
      }
      case "song": {
        const song = item as Song;
        title = "Supprimer la chanson";
        message = `Etes-vous sur de vouloir supprimer la chanson "${song.title}" ? Cette action est irreversible.`;
        break;
      }
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

  const handleUniverseSubmit = async (data: Omit<Universe, "id" | "createdAt">) => {
    if (editingItem) {
      await updateUniverse(editingItem.id, data);
    } else {
      await addUniverse(data);
    }
    handleCloseModal();
  };

  const handleWorkSubmit = async (data: Omit<Work, "id" | "createdAt" | "order">) => {
    let calculatedOrder = 0;

    if (!editingItem) {
      const currentWorks = works.filter((w) => w.universeId === data.universeId);
      const maxOrder =
        currentWorks.length > 0
          ? Math.max(...currentWorks.map((w) => w.order || 0))
          : 0;
      calculatedOrder = maxOrder + 1;
    } else {
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
      id: editingItem
        ? editingItem.id
        : result.success && "data" in result && result.data && "id" in result.data
          ? result.data.id
          : undefined,
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

  const handleMoveWorkUp = async (work: Work) => {
    const currentWorks = works.filter((w) => w.universeId === work.universeId);
    const sortedWorks = currentWorks.sort((a, b) => (a.order || 0) - (b.order || 0));
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
    const sortedWorks = currentWorks.sort((a, b) => (a.order || 0) - (b.order || 0));
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

  const selectedUniverseData = selectedUniverse
    ? universes.find((u) => u.id === selectedUniverse)
    : null;
  const filteredWorks = selectedUniverse
    ? works.filter((work) => work.universeId === selectedUniverse)
    : [];
  const selectedWorkData = selectedWork
    ? works.find((work) => work.id === selectedWork)
    : null;

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
        <CookieStatus />

        <UniverseSection
          universes={universes}
          loading={loading}
          onCreate={() => handleOpenModal("universe")}
          onEdit={(universe) => handleOpenModal("universe", universe)}
          onDelete={(universe) => handleConfirmDelete("universe", universe)}
          onManageWorks={(universe) => {
            setSelectedUniverse(universe.id);
            setSelectedWork(null);
            loadWorks(universe.id);
          }}
        />

        {selectedUniverse && (
          <WorksSection
            universeName={selectedUniverseData?.name}
            works={filteredWorks}
            loading={loading}
            onBack={() => {
              setSelectedUniverse(null);
              setSelectedWork(null);
            }}
            onCreateWork={() => handleOpenModal("work")}
            onEditWork={(work) => handleOpenModal("work", work)}
            onDeleteWork={(work) => handleConfirmDelete("work", work)}
            onManageSongs={(work) => {
              setSelectedWork(work.id);
              loadSongs(work.id);
            }}
            onMoveUp={handleMoveWorkUp}
            onMoveDown={handleMoveWorkDown}
            onReorder={reorderWorks}
          />
        )}

        {selectedWork && (
          <SongsSection
            workTitle={selectedWorkData?.title}
            songs={songs}
            loading={loading}
            onBack={() => setSelectedWork(null)}
            onCreateSong={() => handleOpenModal("song")}
            onEditSong={(song) => handleOpenModal("song", song)}
            onDeleteSong={(song) => handleConfirmDelete("song", song)}
          />
        )}
      </div>

      {activeModal === "universe" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-[3px] border-[#1B1B1B] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[6px_6px_0_#1B1B1B]">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
              {editingItem ? "Modifier l'univers" : "Creer un nouvel univers"}
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
          <div className="bg-white border-[3px] border-[#1B1B1B] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[6px_6px_0_#1B1B1B]">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
              {editingItem ? "Modifier l'oeuvre" : "Creer une nouvelle oeuvre"}
            </h3>
            <WorkForm
              work={editingItem as Work}
              universes={universes}
              defaultUniverseId={!editingItem ? selectedUniverse || undefined : undefined}
              onSubmit={handleWorkSubmit}
              onCancel={handleCloseModal}
              loading={loading}
              onImportSongs={importSongsFromPlaylist}
              pendingImportJob={pendingImportJob}
              onResumeImport={resumeImportFromJob}
            />
          </div>
        </div>
      )}

      {activeModal === "song" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-[3px] border-[#1B1B1B] rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-[6px_6px_0_#1B1B1B]">
            <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">
              {editingItem ? "Modifier la chanson" : "Creer une nouvelle chanson"}
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
