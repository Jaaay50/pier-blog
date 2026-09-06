"use client";

import Image from "next/image";
import { useState } from "react";
import type { EditorialImage } from "@/lib/home-editorial";
import { editorialLocale } from "@/lib/home-editorial";

export function HomeFeatureImage({ image, locale }: { image: EditorialImage; locale: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={image.src}
      alt={image.alt[editorialLocale(locale)]}
      width={image.width}
      height={image.height}
      sizes="(max-width: 767px) 100vw, 60vw"
      className="mt-10 h-auto w-full rounded-xl border border-[var(--border)]"
      onError={() => setFailed(true)}
    />
  );
}
