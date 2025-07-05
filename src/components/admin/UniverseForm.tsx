import { useState } from "react";
import { Universe } from "../../../types";
import { AVAILABLE_ICONS, ICON_CATEGORIES, getIconById } from "../../utils";
import { Button } from "../ui/Button";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface UniverseFormProps {
  universe?: Universe;
  onSubmit: (universeData: Omit<Universe, "id" | "createdAt">) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const UniverseForm = ({
  universe,
  onSubmit,
  onCancel,
  loading = false,
}: UniverseFormProps) => {
  const [formData, setFormData] = useState({
    name: universe?.name || "",
    description: universe?.description || "",
    color: universe?.color || "#3B82F6", // Retour au color picker
    icon: universe?.icon || "wand", // ID de l'icône
    active: universe?.active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCategory, setSelectedCategory] = useState("magic");

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Le nom est requis";
    }

    if (!formData.description.trim()) {
      newErrors.description = "La description est requise";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    await onSubmit(formData);
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Effacer l'erreur pour ce champ
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const selectedIcon = getIconById(formData.icon);
  const categoryIcons = AVAILABLE_ICONS.filter(
    (icon) => icon.category === selectedCategory
  );

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
          Nom de l&apos;univers *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.name ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Ex: Harry Potter"
        />
        {errors.name && (
          <p className="text-red-400 text-sm mt-1">{errors.name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description *
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          rows={4}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.description ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Description de l'univers..."
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1">{errors.description}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Couleur du thème *
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => handleChange("color", e.target.value)}
            className="w-16 h-12 rounded-lg border-2 border-gray-600 bg-gray-800 cursor-pointer"
          />
          <div className="flex-1">
            <input
              type="text"
              value={formData.color}
              onChange={(e) => handleChange("color", e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white border-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="#3B82F6"
            />
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          Choisissez la couleur principale de votre univers
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Icône de l&apos;univers *
        </label>

        {/* Icône sélectionnée */}
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-3">
            {selectedIcon && (
              <>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: formData.color }}
                >
                  <selectedIcon.component className="text-xl text-white" />
                </div>
                <div>
                  <div className="text-white font-medium">
                    {selectedIcon.name}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Icône sélectionnée
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sélecteur de catégorie */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {ICON_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${
                    selectedCategory === category.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }
                `}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grille d'icônes */}
        <div className="grid grid-cols-6 gap-3 max-h-60 overflow-y-auto p-4 bg-gray-800 rounded-lg border border-gray-600">
          {categoryIcons.map((icon) => {
            const IconComponent = icon.component;
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => handleChange("icon", icon.id)}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center transition-all
                  ${
                    formData.icon === icon.id
                      ? "bg-blue-600 text-white"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }
                `}
                title={icon.name}
              >
                <IconComponent className="text-xl" />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={formData.active}
            onChange={(e) => handleChange("active", e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-300">
            Univers actif (visible sur la page d&apos;accueil)
          </span>
        </label>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" variant="primary">
          {universe ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  );
};
