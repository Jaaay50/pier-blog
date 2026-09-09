import { getTranslations } from "next-intl/server";
import { LAB_DEMOS } from "./lab-demos";
import { LabDemoEnhance } from "./LabDemoEnhance";

/** Explanations and posters remain in server HTML, independent of interactive runtimes. */
export async function LabGallery() {
  const t = await getTranslations("lab");
  return (
    <div className="grid gap-8 md:grid-cols-2">
      {LAB_DEMOS.map((demo) => (
        <figure key={demo.id} className={`relative flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] ${demo.full ? "md:col-span-2" : ""}`}>
          <figcaption className="border-b border-[var(--border)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{t(`demos.${demo.id}.title`)}</h3>
            {t.has(`demos.${demo.id}.desc`) && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{t(`demos.${demo.id}.desc`)}</p>
            )}
            {/* Missing technical claims stay unpublished until the author approves them. */}
            {t.has(`demos.${demo.id}.layer`) && (
              <p className="mt-4 border-l-2 border-[var(--accent)] pl-4 text-base font-medium leading-relaxed text-[var(--text-primary)]">{t(`demos.${demo.id}.layer`)}</p>
            )}
            {t.has(`demos.${demo.id}.tech`) && (
              <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">{t(`demos.${demo.id}.tech`)}</p>
            )}
          </figcaption>
          <div className={`relative ${demo.tall ? "h-[560px]" : "h-[480px]"}`}>
            <LabDemoEnhance id={demo.id} still={demo.still} alt={t(`demos.${demo.id}.stillAlt`)} />
          </div>
        </figure>
      ))}
    </div>
  );
}
