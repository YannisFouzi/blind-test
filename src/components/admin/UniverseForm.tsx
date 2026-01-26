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
import { pressable } from "@/styles/ui";

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
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Nom de l&apos;univers *
        </label>
        <input
          type="text"
          {...register("name")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.name ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
          placeholder="Ex: Harry Potter"
        />
        {errors.name && (
          <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Description *
        </label>
        <textarea
          rows={4}
          {...register("description")}
          className={`
            w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
            ${errors.description ? "border-red-500" : "border-[#1B1B1B]"}
            focus:outline-none focus:border-[#1B1B1B] transition-colors
          `}
          placeholder="Description de l&apos;univers..."
        />
        {errors.description && (
          <p className="text-red-600 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Couleur du thème *
        </label>
        <div className="flex items-center space-x-4">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => handleColorChange(e.target.value)}
            className="w-16 h-12 rounded-lg border-2 border-[#1B1B1B] bg-white cursor-pointer shadow-[2px_2px_0_#1B1B1B]"
          />
          <div className="flex-1">
            <input
              type="text"
              {...register("color")}
              className={`
                w-full px-4 py-3 rounded-lg border-2 bg-white text-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]
                ${errors.color ? "border-red-500" : "border-[#1B1B1B]"}
                focus:outline-none focus:border-[#1B1B1B] transition-colors
              `}
              placeholder="#3B82F6"
            />
          </div>
        </div>
        {errors.color ? (
          <p className="text-red-600 text-sm mt-1">{errors.color.message}</p>
        ) : (
          <p className="text-[var(--color-text-secondary)] text-sm mt-1">
            Choisissez la couleur principale de votre univers
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
          Icône de l&apos;univers *
        </label>

        <div className="mb-4 p-4 bg-white rounded-2xl border-[3px] border-[#1B1B1B] shadow-[3px_3px_0_#1B1B1B]">
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
                  <div className="text-[var(--color-text-primary)] font-medium">{selectedIcon.name}</div>
                  <div className="text-[var(--color-text-secondary)] text-sm">Icône sélectionnée</div>
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
                  px-3 py-2 text-sm font-bold ${pressable}
                  ${
                    selectedCategory === category.id
                      ? "bg-[var(--color-brand-primary)] text-[#1B1B1B] hover:bg-[var(--color-brand-primary-light)]"
                      : "bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)]"
                  }
                `}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-6 gap-3 max-h-60 overflow-y-auto p-4 bg-white rounded-2xl border-[3px] border-[#1B1B1B] shadow-[3px_3px_0_#1B1B1B]">
          {categoryIcons.map((icon) => {
            const IconComponent = icon.component;
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => handleIconSelect(icon.id)}
                className={`
                  w-12 h-12 rounded-lg flex items-center justify-center ${pressable}
                  ${
                    iconValue === icon.id
                      ? "bg-[var(--color-brand-primary)] text-[#1B1B1B] hover:bg-[var(--color-brand-primary-light)]"
                      : "bg-white text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)]"
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
          <p className="text-red-600 text-sm mt-2">{errors.icon.message}</p>
        )}
      </div>

      <div>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            className="w-4 h-4 text-[#1B1B1B] bg-white border-[#1B1B1B] rounded focus:ring-black"
            {...register("active")}
          />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
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
