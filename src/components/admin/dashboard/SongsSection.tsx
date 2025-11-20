"use client";

import { Plus } from "lucide-react";
import { Song } from "@/types";
import { Button } from "../../ui/Button";
import { DataTable } from "../../admin/DataTable";

interface SongsSectionProps {
  workTitle?: string;
  songs: Song[];
  loading: boolean;
  onBack: () => void;
  onCreateSong: () => void;
  onEditSong: (song: Song) => void;
  onDeleteSong: (song: Song) => void;
}

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
        <h2 className="text-2xl font-bold text-white">
          Chansons - {workTitle || "Sélection"}
        </h2>
        <div className="flex space-x-2">
          <Button variant="secondary" onClick={onBack}>
            Retour aux œuvres
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
        emptyMessage="Aucune chanson créée"
        onEdit={onEditSong}
        onDelete={onDeleteSong}
      />
    </section>
  );
};
