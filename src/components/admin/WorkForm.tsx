import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Universe, Work } from "@/types";
import { YouTubeService } from "@/services/youtubeService";
import { WorkFormSchema, type WorkFormValues } from "@/validation/admin";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";

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
}

export const WorkForm = ({
  work,
  universes,
  defaultUniverseId,
  onSubmit,
  onCancel,
  loading = false,
  onImportSongs,
}: WorkFormProps) => {
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

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
    const { playlistUrl, playlistId, ...payload } = values;
    void playlistUrl;
    return onSubmit({
      ...payload,
      playlistId: playlistId || "",
    });
  };

  const submitOnly = handleSubmit(submitWork);

  const handlePlaylistValidation = async () => {
    console.log("🔍 [WorkForm] handlePlaylistValidation appelé");
    console.log("📋 [WorkForm] playlistUrl:", playlistUrl);

    if (!playlistUrl.trim()) {
      console.error("❌ [WorkForm] URL vide");
      setError("playlistUrl", {
        message: "L'URL de la playlist est requise",
        type: "manual",
      });
      return;
    }

    setValidating(true);
    clearErrors("playlistUrl");

    try {
      console.log("🔧 [WorkForm] Extraction ID...");
      const extractedId = YouTubeService.extractPlaylistId(playlistUrl);
      console.log("📋 [WorkForm] ID extrait:", extractedId);

      if (!extractedId) {
        console.error("❌ [WorkForm] Extraction échouée");
        setError("playlistUrl", {
          message: "URL de playlist YouTube invalide",
          type: "manual",
        });
        return;
      }

      console.log("🔄 [WorkForm] Validation YouTube API...");
      const validation = await YouTubeService.validatePlaylist(playlistUrl);
      console.log("📦 [WorkForm] Résultat validation:", validation);

      if (validation.isValid && validation.playlistId) {
        console.log("✅ [WorkForm] Playlist valide, setValue playlistId:", validation.playlistId);
        setValue("playlistId", validation.playlistId, {
          shouldValidate: true,
          shouldDirty: true,
        });
      } else {
        console.error("❌ [WorkForm] Validation échouée:", validation.error);
        setError("playlistUrl", {
          message: validation.error || "Playlist invalide",
          type: "manual",
        });
      }
    } catch (error) {
      console.error("❌ [WorkForm] Exception validation:", error);
      setError("playlistUrl", {
        message: "Erreur lors de la validation",
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
        message: "Validez une playlist avant d'importer",
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

  const handleCreateAndImport = handleSubmit(async (values) => {
    console.log("🎬 [WorkForm] handleCreateAndImport appelé");
    console.log("📋 [WorkForm] values:", values);
    console.log("🔧 [WorkForm] onImportSongs:", !!onImportSongs);

    if (!onImportSongs) {
      console.log("⚠️ [WorkForm] onImportSongs non défini, création simple");
      await submitWork(values);
      return;
    }

    if (!values.playlistId) {
      console.error("❌ [WorkForm] Pas de playlistId");
      setError("playlistId", {
        message: "Validez une playlist avant d'importer",
        type: "manual",
      });
      return;
    }

    console.log("🚀 [WorkForm] Début création + import");
    setImporting(true);
    try {
      console.log("📝 [WorkForm] Appel submitWork...");
      const result = await submitWork(values);
      console.log("📦 [WorkForm] Résultat submitWork:", result);

      if (result.success && result.id) {
        console.log("✅ [WorkForm] Œuvre créée, ID:", result.id);
        console.log("🔄 [WorkForm] Appel onImportSongs...");
        await onImportSongs(result.id, values.playlistId);
        console.log("✅ [WorkForm] Import terminé");
      } else {
        console.error("❌ [WorkForm] Échec création œuvre:", result.error);
      }
    } catch (error) {
      console.error("❌ [WorkForm] Exception:", error);
    } finally {
      setImporting(false);
    }
  });

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
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Titre de l&apos;œuvre *
        </label>
        <input
          type="text"
          {...register("title")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.title ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Ex: Harry Potter à l'école des Sorciers"
        />
        {errors.title && (
          <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Univers *
        </label>
        <select
          {...register("universeId")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.universeId ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
        >
          <option value="">Sélectionnez un univers</option>
          {universes.map((universe) => (
            <option key={universe.id} value={universe.id}>
              {universe.name}
            </option>
          ))}
        </select>
        {errors.universeId && (
          <p className="text-red-400 text-sm mt-1">{errors.universeId.message}</p>
        )}
        {!work && defaultUniverseId && universeValue === defaultUniverseId && (
          <p className="text-blue-400 text-sm mt-1">
            ? Univers présélectionné automatiquement
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Playlist YouTube (optionnel)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            {...register("playlistUrl")}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
              ${errors.playlistUrl ? "border-red-500" : "border-gray-600"}
              focus:outline-none focus:border-blue-500 transition-colors
            `}
            placeholder="URL complète ou ID (ex: PLsYgm6hOXgDToCj9jZ80rUUXVH93EDyHM)"
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
        {errors.playlistUrl && (
          <p className="text-red-400 text-sm mt-1">
            {errors.playlistUrl.message}
          </p>
        )}
        {!errors.playlistUrl && !playlistId && playlistUrl && (
          <p className="text-gray-400 text-xs mt-1">
            Accepte : URL complète (https://youtube.com/playlist?list=...) ou ID seul (PLxxxxx)
          </p>
        )}
        {playlistId && (
          <div className="mt-2 space-y-2">
            <p className="text-green-400 text-sm">✓ Playlist validée: {playlistId}</p>
            {work?.id && onImportSongs && (
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  onClick={handleImportSongs}
                  disabled={importing}
                >
                  {importing ? "Import en cours..." : "Importer les chansons"}
                </Button>
                <p className="text-gray-400 text-xs">
                  Ajoute automatiquement toutes les chansons de la playlist
                </p>
              </div>
            )}
          </div>
        )}
        {errors.playlistId && (
          <p className="text-red-400 text-sm mt-1">
            {errors.playlistId.message}
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>

        {!work && playlistId && onImportSongs ? (
          <>
            <Button type="submit" variant="secondary" disabled={isSubmitting}>
              Créer seulement
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleCreateAndImport}
              disabled={importing}
            >
              {importing ? "Création et import..." : "Créer et importer"}
            </Button>
          </>
        ) : (
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {work ? "Mettre à jour" : "Créer"}
          </Button>
        )}
      </div>
    </form>
  );
};

