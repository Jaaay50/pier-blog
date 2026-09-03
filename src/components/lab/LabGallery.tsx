import { getTranslations } from "next-intl/server";
import { LAB_DEMOS } from "./lab-demos";
import { LabDemoEnhance } from "./LabDemoEnhance";

/**
 * Lab 服务端画廊：每个 demo 先以 <figure> 直出标题、说明和 WebP 静帧。
 * canvas 作为 enhancement，由 LabDemoEnhance 在挂载后覆盖上去。
 */
export async function LabGallery() {
  const t = await getTranslations("lab");

  const fluid = LAB_DEMOS.find((d) => d.id === "fluid")!;
  const shader = LAB_DEMOS.find((d) => d.id === "shader")!;
  const grid = LAB_DEMOS.filter((d) => !d.full);

  return (
    <div className="space-y-8">
      <LabFigure demo={fluid} t={t} />
      <div className="grid gap-8 md:grid-cols-2">
        {grid.map((demo) => (
          <LabFigure key={demo.id} demo={demo} t={t} />
        ))}
      </div>
      <LabFigure demo={shader} t={t} />
    </div>
  );
}

function LabFigure({
  demo,
  t,
}: {
  demo: (typeof LAB_DEMOS)[number];
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const title = t(`demos.${demo.id}.title`);
  const desc = t(`demos.${demo.id}.desc`);
  const layer = t(`demos.${demo.id}.layer`);
  const tech = t(`demos.${demo.id}.tech`);
  const alt = t("stillAlt", { title });

  return (
    <figure className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
      <figcaption className="border-b border-[var(--border)] px-5 py-4">
        <h3 className="mb-1 text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mb-2 text-sm leading-relaxed text-[var(--text-secondary)]">{desc}</p>
        <p className="mb-2 text-sm leading-relaxed text-[var(--text-muted)]">{layer}</p>
        <span className="inline-block rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
          {tech}
        </span>
      </figcaption>
      <div className={`relative bg-black ${demo.tall ? "h-[520px]" : "h-[420px]"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 静帧必须是普通 img，才能进 SSR HTML / LCP */}
        <img
          src={demo.still}
          alt={alt}
          width={960}
          height={540}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0">
          <LabDemoEnhance id={demo.id} />
        </div>
      </div>
    </figure>
  );
}
