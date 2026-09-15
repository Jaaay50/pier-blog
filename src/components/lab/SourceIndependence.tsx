"use client";

import { useEffect, useId, useState } from "react";
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
  const detailPrefix = useId();
  const independent = nodes.filter((node) => node.independent).length;
  return (
    <div className="flex min-w-0 flex-col gap-3 p-4">
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
          const expanded = selected === node.id;
          const detailId = `${detailPrefix}-${node.id}`;
          return (
            <li key={node.id}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={detailId}
                onClick={() => onSelect(node.id)}
                className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:border-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${expanded ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"}`}
              >
                <span>{label}</span>
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
              <div id={detailId} hidden={!expanded} className="px-3 pb-1 pt-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                <p>{cited ? (zh ? `转述自 ${cited}` : `Retells ${cited}`) : (zh ? "一手来源，无上游引用。" : "Primary source, with no upstream citation.")}</p>
                <p className="mt-1">{node.independent ? (zh ? "独立材料计数：1" : "Independent evidence count: 1") : (zh ? "属于同一条循环转述链，不增加独立证据。" : "Part of the same retelling loop; adds no independent evidence.")}</p>
              </div>
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
    <div className="bg-[var(--bg-primary)]">
      <div className="grid divide-y divide-[var(--border)] md:grid-cols-2 md:divide-x md:divide-y-0">
        <Column
          title={zh ? "互相转述" : "Retellings"}
          nodes={RETOLD}
          zh={zh}
          selected={selected}
          onSelect={(id) => setSelected((current) => current === id ? null : id)}
        />
        <Column
          title={zh ? "独立来源" : "Independent sources"}
          nodes={PRIMARY}
          zh={zh}
          selected={selected}
          onSelect={(id) => setSelected((current) => current === id ? null : id)}
        />
      </div>
      <LabToolbar>
        <LabButton disabled={!selected} onClick={() => setSelected(null)}>{zh ? "收起" : "Clear"}</LabButton>
        <span className="text-xs text-[var(--text-secondary)]">
          {zh ? "四条转述，一条循环。两份独立材料。" : "Four retellings, one loop. Two independent sources."}
        </span>
      </LabToolbar>
    </div>
  );
}
