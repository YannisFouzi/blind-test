import { useState } from "react";
import { Song, Work } from "../../../types";
import { YouTubeService } from "../../services/youtubeService";
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
  const [formData, setFormData] = useState({
    title: song?.title || "",
    artist: song?.artist || "",
    workId: song?.workId || "",
    youtubeId: song?.youtubeId || "",
    youtubeUrl: "",
    duration: song?.duration || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }

    if (!formData.artist.trim()) {
      newErrors.artist = "L'artiste est requis";
    }

    if (!formData.workId) {
      newErrors.workId = "L'œuvre est requise";
    }

    if (!formData.youtubeId) {
      newErrors.youtubeId = "La vidéo YouTube est requise";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { youtubeUrl, ...submitData } = formData;
    await onSubmit(submitData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleVideoValidation = async () => {
    if (!formData.youtubeUrl.trim()) {
      setErrors((prev) => ({
        ...prev,
        youtubeUrl: "L'URL de la vidéo est requise",
      }));
      return;
    }

    setValidating(true);
    setErrors((prev) => ({ ...prev, youtubeUrl: "" }));

    try {
      const videoId = YouTubeService.extractVideoId(formData.youtubeUrl);
      if (!videoId) {
        setErrors((prev) => ({
          ...prev,
          youtubeUrl: "URL de vidéo YouTube invalide",
        }));
        return;
      }

      const validation = await YouTubeService.validateVideo(
        formData.youtubeUrl
      );

      if (validation.isValid && validation.videoId) {
        setFormData((prev) => ({
          ...prev,
          youtubeId: validation.videoId!,
          title: validation.title || prev.title,
          duration: validation.duration || prev.duration,
        }));
        setErrors((prev) => ({ ...prev, youtubeUrl: "" }));
      } else {
        setErrors((prev) => ({
          ...prev,
          youtubeUrl: validation.error || "Vidéo invalide",
        }));
      }
    } catch {
      setErrors((prev) => ({
        ...prev,
        youtubeUrl: "Erreur lors de la validation",
      }));
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Titre de la chanson *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.title ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Ex: Hedwig's Theme"
        />
        {errors.title && (
          <p className="text-red-400 text-sm mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Artiste/Compositeur *
        </label>
        <input
          type="text"
          value={formData.artist}
          onChange={(e) => handleChange("artist", e.target.value)}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.artist ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Ex: John Williams"
        />
        {errors.artist && (
          <p className="text-red-400 text-sm mt-1">{errors.artist}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Œuvre *
        </label>
        <select
          value={formData.workId}
          onChange={(e) => handleChange("workId", e.target.value)}
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
          <p className="text-red-400 text-sm mt-1">{errors.workId}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Vidéo YouTube *
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={formData.youtubeUrl}
            onChange={(e) => handleChange("youtubeUrl", e.target.value)}
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
            disabled={validating || !formData.youtubeUrl.trim()}
          >
            {validating ? "Validation..." : "Valider"}
          </Button>
        </div>
        {errors.youtubeUrl && (
          <p className="text-red-400 text-sm mt-1">{errors.youtubeUrl}</p>
        )}
        {formData.youtubeId && (
          <p className="text-green-400 text-sm mt-1">
            ✓ Vidéo validée: {formData.youtubeId}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Durée (en secondes)
        </label>
        <input
          type="number"
          value={formData.duration}
          onChange={(e) =>
            handleChange("duration", parseInt(e.target.value) || 0)
          }
          min="0"
          className="w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white border-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          placeholder="Ex: 180"
        />
        <p className="text-gray-400 text-sm mt-1">
          Sera automatiquement rempli lors de la validation YouTube
        </p>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary">
          {song ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  );
};
