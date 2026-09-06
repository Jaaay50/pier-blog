type EditorialLocale = "zh" | "en";
type Localized<T> = Record<EditorialLocale, T>;

type FeatureCopy = {
  label: string;
  title: string;
  body: string;
  primaryLabel: string;
  secondaryLabel: string;
};

export type EditorialImage = {
  src: `/images/${string}`;
  width: number;
  height: number;
  alt: Localized<string>;
};

export type HomeEditorial = {
  id: string;
  primaryHref: `/currents/${string}`;
  secondaryHref: `/currents/${string}`;
  copy: Localized<FeatureCopy>;
} & (
  | { status: "pre-release"; image: null }
  | {
      status: "production-verified";
      image: EditorialImage;
      verification: { scheduledRunId: string; verifiedAt: string; evidence: string };
    }
);

// Production claims and screenshots require evidence from a scheduled production run.
export const homeEditorial: HomeEditorial = {
  id: "models-refresh",
  status: "pre-release",
  image: null,
  primaryHref: "/currents/models",
  secondaryHref: "/currents/models/methodology",
  copy: {
    zh: {
      label: "本期重点",
      title: "让模型榜自己更新",
      body: "正在把模型榜从手动刷新改成每日检查：能确认身份的新模型才收录，来源失败时保留最后有效的数据。自动更新尚待生产验证，先从现有榜单和评分方法看起。",
      primaryLabel: "查看模型榜",
      secondaryLabel: "方法与来源",
    },
    en: {
      label: "In focus",
      title: "A model leaderboard that keeps up",
      body: "Moving the leaderboard from manual refreshes to daily checks: add models only when their identity is confirmed, and keep the last valid data when a source fails. Automatic updates still await production verification; explore the current leaderboard and its methodology.",
      primaryLabel: "Explore the leaderboard",
      secondaryLabel: "Methodology & sources",
    },
  },
};

export function editorialLocale(locale: string): EditorialLocale {
  return locale === "zh" ? "zh" : "en";
}
