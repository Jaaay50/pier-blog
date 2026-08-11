/**
 * Currents 主题 id 清单：与后端 src/topics.ts 保持一致。
 * 独立于 sitemap.ts 存放，避免搜索索引（search.ts）因引用主题清单
 * 而带入 sitemap 的后端 API 依赖。
 */
export const CURRENTS_TOPIC_IDS = [
  "openai", "anthropic", "google", "meta", "mistral", "qwen", "xai", "deepseek",
  "nvidia", "microsoft", "apple", "bytedance",
  "llm", "agent", "multimodal", "video", "image", "audio", "robotics", "reasoning",
  "rl", "rag", "embeddings", "finetuning", "inference", "hardware", "safety",
  "memory", "planning", "code", "mcp", "benchmark", "transformer",
  "opensource", "papers", "product-launch", "policy", "funding",
] as const;

/** topic id → 可读名称（供搜索索引与展示使用） */
export const CURRENTS_TOPIC_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  meta: "Meta",
  mistral: "Mistral",
  qwen: "Qwen",
  xai: "xAI",
  deepseek: "DeepSeek",
  nvidia: "NVIDIA",
  microsoft: "Microsoft",
  apple: "Apple",
  bytedance: "ByteDance",
  llm: "LLM",
  agent: "Agent",
  multimodal: "Multimodal",
  video: "Video",
  image: "Image",
  audio: "Audio",
  robotics: "Robotics",
  reasoning: "Reasoning",
  rl: "RL",
  rag: "RAG",
  embeddings: "Embeddings",
  finetuning: "Fine-tuning",
  inference: "Inference",
  hardware: "Hardware",
  safety: "Safety",
  memory: "Memory",
  planning: "Planning",
  code: "Code",
  mcp: "MCP",
  benchmark: "Benchmark",
  transformer: "Transformer",
  opensource: "Open Source",
  papers: "Papers",
  "product-launch": "Product Launch",
  policy: "Policy",
  funding: "Funding",
};
