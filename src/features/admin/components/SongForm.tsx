import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Song, Work } from "@/types";
import { YouTubeService } from "@/services/youtube/youtube.service";
import { SongFormSchema, type SongFormValues } from "@/features/admin/validation/admin";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface SongFormProps {
  song?: Song;
  works: Work[];
  onSubmit: (
    data: Omit<Song, "id" | "createdAt">
  ) => Promise<{ success: boolean; error?: string }>;
  onCancel: () => void;
  loading?: boolean;
}

const YOUTUBE_REQUIRED_MESSAGE = "L'URL de la video est requise";
const YOUTUBE_INVALID_MESSAGE = "URL de video YouTube invalide";
const YOUTUBE_VALIDATION_ERROR = "Erreur lors de la validation";
const YOUTUBE_VALIDATED_MESSAGE = "Video validee";
const DEFAULT_WORK_LABEL = "Selectionnez une oeuvre";

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
    const { youtubeUrl: ignoredUrl, ...payload } = values;
    void ignoredUrl;
    await onSubmit(payload);
  };

  const handleVideoValidation = async () => {
    if (!youtubeUrl.trim()) {
      setError("youtubeUrl", {
        message: YOUTUBE_REQUIRED_MESSAGE,
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
          message: YOUTUBE_INVALID_MESSAGE,
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
          message: validation.error || "Video invalide",
          type: "manual",
        });
      }
    } catch {
      setError("youtubeUrl", {
        message: YOUTUBE_VALIDATION_ERROR,
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
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Titre de la chanson *
        </label>
        <input
          type="text"
          {...register("title")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.title ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
          placeholder="Ex: Hedwig's Theme"
        />
        {errors.title && <p className="text-red-600 text-sm mt-1">{errors.title.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          URL audio (Cloudflare) *
        </label>
        <input
          type="url"
          {...register("audioUrl")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.audioUrl ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
          placeholder="https://cdn.mon-cloud.com/musiques/track.mp3"
        />
        {errors.audioUrl ? (
          <p className="text-red-600 text-sm mt-1">{errors.audioUrl.message}</p>
        ) : (
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            URL signee ou publique pointant vers votre MP3 Cloudflare/S3.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Artiste/Compositeur *
        </label>
        <input
          type="text"
          {...register("artist")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.artist ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
          placeholder="Ex: John Williams"
        />
        {errors.artist && <p className="text-red-600 text-sm mt-1">{errors.artist.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Oeuvre *
        </label>
        <select
          {...register("workId")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.workId ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
        >
          <option value="">{DEFAULT_WORK_LABEL}</option>
          {works.map((work) => (
            <option key={work.id} value={work.id}>
              {work.title}
            </option>
          ))}
        </select>
        {errors.workId && <p className="text-red-600 text-sm mt-1">{errors.workId.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Video YouTube *
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            {...register("youtubeUrl")}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
              ${errors.youtubeUrl ? "border-red-500" : "border-[#1B1B1B]"}
              focus:outline-none focus:border-[#1B1B1B] transition-colors
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
          <p className="text-red-600 text-sm mt-1">{errors.youtubeUrl.message}</p>
        )}
        {youtubeId && (
          <p className="text-green-700 text-sm mt-1">
            ? {YOUTUBE_VALIDATED_MESSAGE}: {youtubeId}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Duree (en secondes)
        </label>
        <input
          type="number"
          min="0"
          placeholder="Ex: 180"
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.duration ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
          {...register("duration", { valueAsNumber: true })}
        />
        {errors.duration ? (
          <p className="text-red-600 text-sm mt-1">{errors.duration.message}</p>
        ) : (
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Sera automatiquement rempli lors de la validation YouTube
          </p>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {song ? "Mettre a jour" : "Creer"}
        </Button>
      </div>
    </form>
  );
};

