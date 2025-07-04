import { useState } from "react";
import { Universe, Work } from "../../../types";
import { YouTubeService } from "../../services/youtubeService";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface WorkFormProps {
  work?: Work;
  universes: Universe[];
  defaultUniverseId?: string; // Pré-sélection automatique de l'univers
  onSubmit: (
    data: Omit<Work, "id" | "createdAt">
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
  const [formData, setFormData] = useState({
    title: work?.title || "",
    universeId: work?.universeId || defaultUniverseId || "",
    playlistId: work?.playlistId || "",
    playlistUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Le titre est requis";
    }

    if (!formData.universeId) {
      newErrors.universeId = "L'univers est requis";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const { playlistUrl, ...submitData } = formData;
    await onSubmit(submitData);
  };

  const handleCreateAndImport = async () => {
    if (!validateForm()) return;
    if (!formData.playlistId || !onImportSongs) return;

    setImporting(true);
    try {
      // 1. Créer l'œuvre
      const { playlistUrl, ...submitData } = formData;
      const result = await onSubmit(submitData);

      // 2. Si création réussie, importer les chansons
      if (result.success && result.id) {
        await onImportSongs(result.id, formData.playlistId);
      }
    } catch (error) {
      console.error("Erreur lors de la création et import:", error);
    } finally {
      setImporting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePlaylistValidation = async () => {
    if (!formData.playlistUrl.trim()) {
      setErrors((prev) => ({
        ...prev,
        playlistUrl: "L'URL de la playlist est requise",
      }));
      return;
    }

    setValidating(true);
    setErrors((prev) => ({ ...prev, playlistUrl: "" }));

    try {
      const playlistId = YouTubeService.extractPlaylistId(formData.playlistUrl);
      if (!playlistId) {
        setErrors((prev) => ({
          ...prev,
          playlistUrl: "URL de playlist YouTube invalide",
        }));
        return;
      }

      const validation = await YouTubeService.validatePlaylist(
        formData.playlistUrl
      );

      if (validation.isValid && validation.playlistId) {
        setFormData((prev) => ({
          ...prev,
          playlistId: validation.playlistId!,
        }));
        setErrors((prev) => ({ ...prev, playlistUrl: "" }));
      } else {
        setErrors((prev) => ({
          ...prev,
          playlistUrl: validation.error || "Playlist invalide",
        }));
      }
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        playlistUrl: "Erreur lors de la validation",
      }));
    } finally {
      setValidating(false);
    }
  };

  const handleImportSongs = async () => {
    if (!work?.id || !formData.playlistId || !onImportSongs) return;

    setImporting(true);
    try {
      await onImportSongs(work.id, formData.playlistId);
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
    } finally {
      setImporting(false);
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
          Titre de l&apos;œuvre *
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
          placeholder="Ex: Harry Potter à l'École des Sorciers"
        />
        {errors.title && (
          <p className="text-red-400 text-sm mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Univers *
        </label>
        <select
          value={formData.universeId}
          onChange={(e) => handleChange("universeId", e.target.value)}
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
          <p className="text-red-400 text-sm mt-1">{errors.universeId}</p>
        )}
        {!work &&
          defaultUniverseId &&
          formData.universeId === defaultUniverseId && (
            <p className="text-blue-400 text-sm mt-1">
              ℹ️ Univers pré-sélectionné automatiquement
            </p>
          )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Playlist YouTube (optionnel)
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={formData.playlistUrl}
            onChange={(e) => handleChange("playlistUrl", e.target.value)}
            className={`
              flex-1 px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
              ${errors.playlistUrl ? "border-red-500" : "border-gray-600"}
              focus:outline-none focus:border-blue-500 transition-colors
            `}
            placeholder="https://www.youtube.com/playlist?list=..."
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handlePlaylistValidation}
            disabled={validating || !formData.playlistUrl.trim()}
          >
            {validating ? "Validation..." : "Valider"}
          </Button>
        </div>
        {errors.playlistUrl && (
          <p className="text-red-400 text-sm mt-1">{errors.playlistUrl}</p>
        )}
        {formData.playlistId && (
          <div className="mt-2 space-y-2">
            <p className="text-green-400 text-sm">
              ✓ Playlist validée: {formData.playlistId}
            </p>
            {work?.id && onImportSongs && (
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant="success"
                  size="small"
                  onClick={handleImportSongs}
                  disabled={importing}
                >
                  {importing
                    ? "Import en cours..."
                    : "🎵 Importer les chansons"}
                </Button>
                <p className="text-gray-400 text-xs">
                  Ajoute automatiquement toutes les chansons de la playlist
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>

        {/* Mode création avec playlist validée : proposer l'import automatique */}
        {!work && formData.playlistId && onImportSongs ? (
          <>
            <Button type="submit" variant="secondary">
              Créer seulement
            </Button>
            <Button
              type="button"
              variant="success"
              onClick={handleCreateAndImport}
              disabled={importing}
            >
              {importing
                ? "Création et import..."
                : "🎵 Créer et importer les chansons"}
            </Button>
          </>
        ) : (
          <Button type="submit" variant="primary">
            {work ? "Mettre à jour" : "Créer"}
          </Button>
        )}
      </div>
    </form>
  );
};
