import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Universe } from "@/types";
import {
  AVAILABLE_ICONS,
  ICON_CATEGORIES,
  type IconCategoryId,
  getIconById,
} from "@/constants/icons";
import {
  UniverseFormSchema,
  type UniverseFormValues,
} from "@/validation/admin";
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
  const initialCategory: IconCategoryId =
    getIconById(universe?.icon || "")?.category || "magic";
  const [selectedCategory, setSelectedCategory] =
    useState<IconCategoryId>(initialCategory);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<UniverseFormValues>({
    resolver: zodResolver(UniverseFormSchema),
    defaultValues: {
      name: universe?.name || "",
      description: universe?.description || "",
      color: universe?.color || "#3B82F6",
      icon: universe?.icon || "wand",
      active: universe?.active ?? true,
    },
  });

  useEffect(() => {
    reset({
      name: universe?.name || "",
      description: universe?.description || "",
      color: universe?.color || "#3B82F6",
      icon: universe?.icon || "wand",
      active: universe?.active ?? true,
    });

    const category = getIconById(universe?.icon || "")?.category;
    if (category) {
      setSelectedCategory(category);
    }
  }, [universe, reset]);

  const colorValue = watch("color");
  const iconValue = watch("icon");
  const selectedIcon = useMemo(() => getIconById(iconValue || ""), [iconValue]);
  const categoryIcons = useMemo(
    () => AVAILABLE_ICONS.filter((icon) => icon.category === selectedCategory),
    [selectedCategory]
  );

  const onFormSubmit = async (values: UniverseFormValues) => {
    await onSubmit(values);
  };

  const handleColorChange = (value: string) => {
    setValue("color", value, { shouldValidate: true, shouldDirty: true });
  };

  const handleIconSelect = (iconId: string) => {
    setValue("icon", iconId, { shouldValidate: true, shouldDirty: true });
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
          Nom de l&apos;univers *
        </label>
        <input
          type="text"
          {...register("name")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.name ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Ex: Harry Potter"
        />
        {errors.name && (
          <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Description *
        </label>
        <textarea
          rows={4}
          {...register("description")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
            ${errors.description ? "border-red-500" : "border-gray-600"}
            focus:outline-none focus:border-blue-500 transition-colors
          `}
          placeholder="Description de l&apos;univers..."
        />
        {errors.description && (
          <p className="text-red-400 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Couleur du thème *
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-16 h-12 rounded-lg border-2 border-gray-600 bg-gray-800 cursor-pointer"
          />
          <div className="flex-1">
            <input
              type="text"
              {...register("color")}
              className={`
                w-full px-4 py-3 rounded-lg border-2 bg-gray-800 text-white
                ${errors.color ? "border-red-500" : "border-gray-600"}
                focus:outline-none focus:border-blue-500 transition-colors
              `}
              placeholder="#3B82F6"
            />
          </div>
        </div>
        {errors.color ? (
          <p className="text-red-400 text-sm mt-1">{errors.color.message}</p>
        ) : (
          <p className="text-gray-400 text-sm mt-1">
            Choisissez la couleur principale de votre univers
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Icône de l&apos;univers *
        </label>

        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-600">
          <div className="flex items-center space-x-3">
            {selectedIcon && (
              <>
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: colorValue }}
                >
                  <selectedIcon.component className="text-xl text-white" />
                </div>
                <div>
                  <div className="text-white font-medium">{selectedIcon.name}</div>
                  <div className="text-gray-400 text-sm">Icône sélectionnée</div>
                </div>
              </>
            )}
          </div>
        </div>

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

        <div className="grid grid-cols-6 gap-3 max-h-60 overflow-y-auto p-4 bg-gray-800 rounded-lg border border-gray-600">
          {categoryIcons.map((icon) => {
            const IconComponent = icon.component;
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => handleIconSelect(icon.id)}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center transition-all
                  ${
                    iconValue === icon.id
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
        {errors.icon && (
          <p className="text-red-400 text-sm mt-2">{errors.icon.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            {...register("active")}
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
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {universe ? "Mettre à jour" : "Créer"}
        </Button>
      </div>
    </form>
  );
};
