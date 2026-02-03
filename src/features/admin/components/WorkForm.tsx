import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Universe, Work } from "@/types";
import { YouTubeService } from "@/services/youtube/youtube.service";
import { WorkFormSchema, type WorkFormValues } from "@/features/admin/validation/admin";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface WorkFormProps {
  work?: Work;
  universes: Universe[];
  defaultUniverseId?: string;
  onSubmit: (
    data: Omit<Work, "id" | "createdAt" | "order">
  ) => Promise<{ success: boolean; error?: string; id?: string }>;
  onCancel: () => void;
  loading?: boolean;
  onImportSongs?: (
    workId: string,
    playlistId: string
  ) => Promise<{ success: boolean; error?: string }>;
  pendingImportJob?: { workId: string; jobId: string } | null;
  onResumeImport?: (
    workId: string,
    jobId: string
  ) => Promise<{ success: boolean; error?: string }>;
}

const IMPORT_ERROR_MESSAGE = "Validez une playlist avant d'importer";
const PLAYLIST_REQUIRED_MESSAGE = "L'URL de la playlist est requise";
const PLAYLIST_INVALID_MESSAGE = "URL de playlist YouTube invalide";
const PLAYLIST_VALIDATION_ERROR = "Erreur lors de la validation";
const PLAYLIST_HELP_TEXT =
  "Accepte : URL complete (https://youtube.com/playlist?list=...) ou ID seul (PLxxxxx)";
const DEFAULT_UNIVERSE_MESSAGE = "Univers preselectionne automatiquement";

export const WorkForm = ({
  work,
  universes,
  defaultUniverseId,
  onSubmit,
  onCancel,
  loading = false,
  onImportSongs,
  pendingImportJob,
  onResumeImport,
}: WorkFormProps) => {
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resuming, setResuming] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    setError,
    clearErrors,
    reset,
  } = useForm<WorkFormValues>({
    resolver: zodResolver(WorkFormSchema),
    defaultValues: {
      title: work?.title || "",
      universeId: work?.universeId || defaultUniverseId || "",
      playlistId: work?.playlistId || "",
      playlistUrl: "",
    },
  });

  useEffect(() => {
    reset({
      title: work?.title || "",
      universeId: work?.universeId || defaultUniverseId || "",
      playlistId: work?.playlistId || "",
      playlistUrl: "",
    });
  }, [work, defaultUniverseId, reset]);

  const playlistId = watch("playlistId") || "";
  const playlistUrl = watch("playlistUrl") || "";
  const universeValue = watch("universeId");

  const submitWork = async (values: WorkFormValues) => {
    const { playlistUrl: ignoredUrl, playlistId: rawPlaylistId, ...payload } = values;
    void ignoredUrl;
    return onSubmit({
      ...payload,
      playlistId: rawPlaylistId || "",
    });
  };

  const submitOnly = handleSubmit(submitWork);

  const handlePlaylistValidation = async () => {
    if (!playlistUrl.trim()) {
      setError("playlistUrl", {
        message: PLAYLIST_REQUIRED_MESSAGE,
        type: "manual",
      });
      return;
    }

    setValidating(true);
    clearErrors("playlistUrl");

    try {
      const extractedId = YouTubeService.extractPlaylistId(playlistUrl);

      if (!extractedId) {
        setError("playlistUrl", {
          message: PLAYLIST_INVALID_MESSAGE,
          type: "manual",
        });
        return;
      }

      const validation = await YouTubeService.validatePlaylist(playlistUrl);

      if (validation.isValid && validation.playlistId) {
        setValue("playlistId", validation.playlistId, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        setError("playlistUrl", {
          message: validation.error || "Playlist invalide",
          type: "manual",
        });
      }
    } catch {
      setError("playlistUrl", {
        message: PLAYLIST_VALIDATION_ERROR,
        type: "manual",
      });
    } finally {
      setValidating(false);
    }
  };

  const handleImportSongs = async () => {
    if (!work?.id || !onImportSongs) {
      return;
    }

    if (!playlistId) {
      setError("playlistId", {
        message: IMPORT_ERROR_MESSAGE,
        type: "manual",
      });
      return;
    }

    setImporting(true);
    try {
      await onImportSongs(work.id, playlistId);
    } finally {
      setImporting(false);
    }
  };

  const handleResumeImport = async () => {
    if (!work?.id || !pendingImportJob?.jobId || !onResumeImport) {
      return;
    }

    setResuming(true);
    try {
      await onResumeImport(work.id, pendingImportJob.jobId);
    } finally {
      setResuming(false);
    }
  };

  const handleCreateAndImport = handleSubmit(async (values) => {
    if (!onImportSongs) {
      await submitWork(values);
      return;
    }

    if (!values.playlistId) {
      setError("playlistId", {
        message: IMPORT_ERROR_MESSAGE,
        type: "manual",
      });
      return;
    }

    setImporting(true);
    try {
      const result = await submitWork(values);

      if (result.success && result.id) {
        await onImportSongs(result.id, values.playlistId);
      }
    } finally {
      setImporting(false);
    }
  });

  const importButtonLabel = importing ? "Import en cours..." : "Importer les chansons";
  const resumeButtonLabel = resuming ? "Reprise..." : "Reprendre l'import";
  const submitLabel = work ? "Mettre a jour" : "Creer";
  const createImportLabel = importing ? "Creation et import..." : "Creer et importer";

  const playlistStatus = useMemo(() => {
    if (errors.playlistUrl) {
      return { message: errors.playlistUrl.message, tone: "error" as const };
    }

    if (!playlistId && playlistUrl) {
      return { message: PLAYLIST_HELP_TEXT, tone: "muted" as const };
    }

    if (playlistId) {
      return { message: `Playlist validee: ${playlistId}`, tone: "success" as const };
    }

    return null;
  }, [errors.playlistUrl, playlistId, playlistUrl]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <form onSubmit={submitOnly} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Titre de l&apos;oeuvre *
        </label>
        <input
          type="text"
          {...register("title")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.title ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
          placeholder="Ex: Harry Potter a l'ecole des Sorciers"
        />
        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Univers *
        </label>
        <select
          {...register("universeId")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.universeId ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
        >
          <option value="">Selectionnez un univers</option>
          {universes.map((universe) => (
            <option key={universe.id} value={universe.id}>
              {universe.name}
            </option>
          ))}
        </select>
        {errors.universeId && (
          <p className="text-red-600 text-sm mt-1">{errors.universeId.message}</p>
        )}
        {!work && defaultUniverseId && universeValue === defaultUniverseId && (
          <p className="text-[var(--color-brand-secondary)] text-sm mt-1">
            ? {DEFAULT_UNIVERSE_MESSAGE}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Playlist YouTube (optionnel)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            {...register("playlistUrl")}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
              ${errors.playlistUrl ? "border-red-500" : "border-[#1B1B1B]"}
              focus:outline-none focus:border-[#1B1B1B] transition-colors
            `}
            placeholder="URL complete ou ID (ex: PLsYgm6hOXgDToCj9jZ80rUUXVH93EDyHM)"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handlePlaylistValidation}
            disabled={validating || !playlistUrl.trim()}
          >
            {validating ? "Validation..." : "Valider"}
          </Button>
        </div>
        {playlistStatus?.tone === "error" && (
          <p className="text-red-600 text-sm mt-1">{playlistStatus.message}</p>
        )}
        {playlistStatus?.tone === "muted" && (
          <p className="text-[var(--color-text-secondary)] text-xs mt-1">
            {playlistStatus.message}
          </p>
        )}
        {playlistStatus?.tone === "success" && (
          <p className="text-green-700 text-sm mt-1">{playlistStatus.message}</p>
        )}

        {playlistId && (
          <div className="mt-2 space-y-2">
            {work?.id && onImportSongs && (
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={handleImportSongs}
                  disabled={importing}
                >
                  {importButtonLabel}
                </Button>
                <p className="text-[var(--color-text-secondary)] text-xs">
                  Ajoute automatiquement toutes les chansons de la playlist
                </p>
              </div>
            )}
          </div>
        )}

        {pendingImportJob && work?.id === pendingImportJob.workId && onResumeImport && (
          <div className="mt-3 flex items-center space-x-2">
            <Button
              type="button"
              variant="warning"
              size="sm"
              onClick={handleResumeImport}
              disabled={resuming}
            >
              {resumeButtonLabel}
            </Button>
            <p className="text-yellow-700 text-xs">
              Import en attente (jobId: {pendingImportJob.jobId})
            </p>
          </div>
        )}
        {errors.playlistId && (
          <p className="text-red-600 text-sm mt-1">{errors.playlistId.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>

        {!work && playlistId && onImportSongs ? (
          <>
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              Creer seulement
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleCreateAndImport}
              disabled={importing}
            >
              {createImportLabel}
            </Button>
          </>
        ) : (
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
};

