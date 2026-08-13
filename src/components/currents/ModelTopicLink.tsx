import { TransitionLink } from "@/components/TransitionLink";
import { CURRENTS_TOPIC_IDS } from "@/lib/currents/topics";

/**
 * 厂商 → 现有潮汐主题页关联：注册表 vendorId 命中主题清单时链到
 * /currents/topics/[id]（该厂商的相关模型动态），未命中显示纯文本。
 */
const VENDOR_TOPIC_MAP: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  meta: "meta",
  mistral: "mistral",
  alibaba: "qwen",
  xai: "xai",
  deepseek: "deepseek",
  nvidia: "nvidia",
  microsoft: "microsoft",
  bytedance: "bytedance",
};

const TOPIC_ID_SET = new Set<string>(CURRENTS_TOPIC_IDS);

export function ModelTopicLink({ vendorId, vendorName }: { vendorId: string; vendorName: string }) {
  const topicId = VENDOR_TOPIC_MAP[vendorId];
  if (!topicId || !TOPIC_ID_SET.has(topicId)) {
    return <span>{vendorName}</span>;
  }
  return (
    <TransitionLink
      href={`/currents/topics/${topicId}`}
      className="text-[var(--accent)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
    >
      {vendorName}
    </TransitionLink>
  );
}
