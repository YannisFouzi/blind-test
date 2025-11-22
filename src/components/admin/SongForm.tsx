import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Song, Work } from "@/types";
import { YouTubeService } from "@/services/youtubeService";
import { SongFormSchema, type SongFormValues } from "@/validation/admin";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface SongFormProps {
  song?: Song;
  works: Work[];
  onSubmit: (
    data: Omit<Song, "id" | "createdAt">
  ) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  loading?: boolean;
}

export const SongForm = ({
  song,
  works,
  onSubmit,
  onCancel,
  loading = false,
}: SongFormProps) => {
  const [validating, setValidating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    setError,
    clearErrors,
    watch,
    reset,
  } = useForm<SongFormValues>({
    resolver: zodResolver(SongFormSchema),
    defaultValues: {
      title: song?.title || "",
      artist: song?.artist || "",
      workId: song?.workId || "",
      youtubeId: song?.youtubeId || "",
      audioUrl: song?.audioUrl || "",
      youtubeUrl: "",
      duration: song?.duration || 0,
    },
  });

  useEffect(() => {
    reset({
      title: song?.title || "",
      artist: song?.artist || "",
      workId: song?.workId || "",
      youtubeId: song?.youtubeId || "",
      audioUrl: song?.audioUrl || "",
      youtubeUrl: "",
      duration: song?.duration || 0,
    });
  }, [song, reset]);

  const youtubeUrl = watch("youtubeUrl") || "";
  const youtubeId = watch("youtubeId");

  const onFormSubmit = async (values: SongFormValues) => {
    const { youtubeUrl, ...payload } = values;
    void youtubeUrl;
    await onSubmit(payload);
  };

  const handleVideoValidation = async () => {
    if (!youtubeUrl.trim()) {
      setError("youtubeUrl", {
        message: "L'URL de la vidéo est requise",
        type: "manual",
      });
      return;
    }

    setValidating(true);
    clearErrors("youtubeUrl");

    try {
      const extractedId = YouTubeService.extractVideoId(youtubeUrl);
      if (!extractedId) {
        setError("youtubeUrl", {
          message: "URL de vidéo YouTube invalide",
          type: "manual",
        });
        return;
      }

      const validation = await YouTubeService.validateVideo(youtubeUrl);

      if (validation.isValid && validation.videoId) {
        setValue("youtubeId", validation.videoId, { shouldValidate: true });

        if (validation.title) {
          setValue("title", validation.title, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }

        if (typeof validation.duration === "number") {
          setValue("duration", validation.duration, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      } else {
        setError("youtubeUrl", {
          message: validation.error || "Vidéo invalide",
          type: "manual",
        });
      }
    } catch {
      setError("youtubeUrl", {
        message: "Erreur lors de la validation",
        type: "manual",
      });
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-40">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Titre de la chanson *
        </label>
        <input
          type="text"
          {...register("title")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.title ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Ex: Hedwig's Theme"
        />
        {errors.title && (
          <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          URL audio (Cloudflare) *
        </label>
        <input
          type="url"
          {...register("audioUrl")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.audioUrl ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="https://cdn.mon-cloud.com/musiques/track.mp3"
        />
        {errors.audioUrl ? (
          <p className="text-red-400 text-sm mt-1">
            {errors.audioUrl.message}
          </p>
        ) : (
          <p className="text-gray-400 text-sm mt-1">
            URL signée ou publique pointant vers votre MP3 Cloudflare/S3.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Artiste/Compositeur *
        </label>
        <input
          type="text"
          {...register("artist")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.artist ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Ex: John Williams"
        />
        {errors.artist && (
          <p className="text-red-400 text-sm mt-1">{errors.artist.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Œuvre *
        </label>
        <select
          {...register("workId")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.workId ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
        >
          <option value="">Sélectionnez une œuvre</option>
          {works.map((work) => (
            <option key={work.id} value={work.id}>
              {work.title}
            </option>
          ))}
        </select>
        {errors.workId && (
          <p className="text-red-400 text-sm mt-1">{errors.workId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Vidéo YouTube *
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            {...register("youtubeUrl")}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
              ${errors.youtubeUrl ? "border-red-500" : "border-gray-600"}
              focus:outline-none focus:border-blue-500 transition-colors
            `}
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleVideoValidation}
            disabled={validating || !youtubeUrl.trim()}
          >
            {validating ? "Validation..." : "Valider"}
          </Button>
        </div>
        {errors.youtubeUrl && (
          <p className="text-red-400 text-sm mt-1">
            {errors.youtubeUrl.message}
          </p>
        )}
        {youtubeId && (
          <p className="text-green-400 text-sm mt-1">
            ? Vidéo validée: {youtubeId}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Durée (en secondes)
        </label>
        <input
          type="number"
          min="0"
          placeholder="Ex: 180"
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.duration ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          {...register("duration", { valueAsNumber: true })}
        />
        {errors.duration ? (
          <p className="text-red-400 text-sm mt-1">
            {errors.duration.message}
          </p>
        ) : (
          <p className="text-gray-400 text-sm mt-1">
            Sera automatiquement rempli lors de la validation YouTube
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {song ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  );
};
