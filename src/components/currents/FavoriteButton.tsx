"use client";

import { useTranslations } from "next-intl";
import { toggleFavorite } from "@/lib/currents/favorites";
import { useIsFavorite } from "@/lib/currents/useFavorites";

interface FavoriteButtonProps {
  itemId: string;
  className?: string;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.6l2.5 5.1 5.6.8-4.05 3.95.96 5.58L12 16.4l-5.01 2.63.96-5.58L3.9 9.5l5.6-.8L12 3.6z" />
    </svg>
  );
}

export function FavoriteButton({ itemId, className }: FavoriteButtonProps) {
  const t = useTranslations("currents");
  const fav = useIsFavorite(itemId);

  return (
    <button
      type="button"
      aria-pressed={fav}
      aria-label={fav ? t("unfavorite") : t("favorite")}
      title={fav ? t("unfavorite") : t("favorite")}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(itemId);
      }}
      className={`inline-flex items-center justify-center rounded-full p-1.5 transition-colors ${
        fav
          ? "text-[var(--accent)]"
          : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
      } ${className ?? ""}`}
    >
      <StarIcon filled={fav} />
    </button>
  );
}
