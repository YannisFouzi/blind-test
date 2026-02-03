"use client";

import { Plus } from "lucide-react";
import type { Song } from "@/types";
import { DataTable } from "@/features/admin/components/DataTable";
import { Button } from "@/components/ui/Button";

interface SongsSectionProps {
  workTitle?: string;
  songs: Song[];
  loading: boolean;
  onBack: () => void;
  onCreateSong: () => void;
  onEditSong: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
}

const formatDuration = (value: unknown) => {
  const duration = Number(value) || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const renderAudioLink = (value: unknown) => {
  const url = typeof value === "string" ? value : "";
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-[var(--color-brand-secondary)] hover:underline"
    >
      Ouvrir
    </a>
  ) : (
    <span className="text-[var(--color-text-secondary)]">Aucun</span>
  );
};

const songColumns = [
  { key: "title" as keyof Song, label: "Titre" },
  { key: "artist" as keyof Song, label: "Artiste" },
  { key: "youtubeId" as keyof Song, label: "YouTube ID" },
  { key: "audioUrl" as keyof Song, label: "Audio", render: renderAudioLink },
  { key: "duration" as keyof Song, label: "Duree", render: formatDuration },
];

export const SongsSection = ({
  workTitle,
  songs,
  loading,
  onBack,
  onCreateSong,
  onEditSong,
  onDeleteSong,
}: SongsSectionProps) => {
  return (
    <section>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">
          Chansons - {workTitle || "Selection"}
        </h2>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={onBack}>
            Retour aux oeuvres
          </Button>
          <Button
            variant="primary"
            onClick={onCreateSong}
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
        emptyMessage="Aucune chanson creee"
        onEdit={onEditSong}
        onDelete={onDeleteSong}
      />
    </section>
  );
};

