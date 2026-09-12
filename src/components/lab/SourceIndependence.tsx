"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { LabButton, LabToolbar } from "./LabControls";
import type { NewDemoProps } from "./new-demo-types";

type Node = {
  id: string;
  labelZh: string;
  labelEn: string;
  cites: string[];
  independent: boolean;
};

const RETOLD: Node[] = [
  { id: "a", labelZh: "媒体 A", labelEn: "Outlet A", cites: ["b"], independent: false },
  { id: "b", labelZh: "媒体 B", labelEn: "Outlet B", cites: ["a"], independent: false },
  { id: "c", labelZh: "媒体 C", labelEn: "Outlet C", cites: ["b"], independent: false },
  { id: "d", labelZh: "媒体 D", labelEn: "Outlet D", cites: ["c"], independent: false },
];

const PRIMARY: Node[] = [
  { id: "paper", labelZh: "论文", labelEn: "Paper", cites: [], independent: true },
  { id: "blog", labelZh: "官方说明", labelEn: "Official note", cites: [], independent: true },
];

function Column({
  title,
  nodes,
  zh,
  selected,
  onSelect,
}: {
  title: string;
  nodes: Node[];
  zh: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const independent = nodes.filter((node) => node.independent).length;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
      <h4 className="text-sm font-medium text-[var(--text-primary)]">{title}</h4>
      <p className="text-xs text-[var(--text-secondary)]">
        {zh ? `转述 ${nodes.length} · 独立 ${independent}` : `${nodes.length} mentions · ${independent} independent`}
      </p>
      <ul className="space-y-2">
        {nodes.map((node) => {
          const label = zh ? node.labelZh : node.labelEn;
          const cited = node.cites
            .map((id) => nodes.find((item) => item.id === id))
            .filter(Boolean)
            .map((item) => (zh ? item!.labelZh : item!.labelEn))
            .join(zh ? "、" : ", ");
          return (
            <li key={node.id}>
              <button
                type="button"
                aria-pressed={selected === node.id}
                onClick={() => onSelect(node.id)}
                className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
              >
                <span className="block">{label}</span>
                <span className="mt-1 block text-xs text-[var(--text-secondary)]">
                  {cited
                    ? zh ? `转述自 ${cited}` : `Retells ${cited}`
                    : zh ? "一手来源" : "Primary source"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SourceIndependence({ onReadyChange }: NewDemoProps) {
  const zh = useLocale() === "zh";
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    onReadyChange?.(true);
    return () => onReadyChange?.(false);
  }, [onReadyChange]);

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)]">
      <p className="border-b border-[var(--border)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        {zh
          ? "实验：左边四家在互相转述同一句话；右边两份独立材料。转述数量不是独立证据数量。"
          : "Experiment: four outlets retelling one another, versus two independent primaries. Mention count is not evidence count."}
      </p>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3 md:flex-row">
        <Column
          title={zh ? "互相转述" : "Retellings"}
          nodes={RETOLD}
          zh={zh}
          selected={selected}
          onSelect={setSelected}
        />
        <Column
          title={zh ? "独立来源" : "Independent sources"}
          nodes={PRIMARY}
          zh={zh}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
      <LabToolbar>
        <LabButton onClick={() => setSelected(null)}>{zh ? "收起" : "Clear"}</LabButton>
        <span className="text-xs text-[var(--text-secondary)]">
          {zh ? "点开一条看它引用谁。左边循环引用，右边没有上游。" : "Open a card to see who it cites. The left loops; the right has no upstream."}
        </span>
      </LabToolbar>
    </div>
  );
}
