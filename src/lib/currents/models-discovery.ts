import { CURRENTS_API_BASE } from "./api";
import { isModelsMetaResponse, type ModelsMetaResponse } from "./models-types";

export type DiscoverableModel = ModelsMetaResponse["models"][number];

/** Shared discovery path for search and sitemap; the backend registry remains the source of truth. */
export async function fetchDiscoverableModels(
  fetchImpl: typeof fetch = fetch,
): Promise<DiscoverableModel[]> {
  const response = await fetchImpl(`${CURRENTS_API_BASE}/v1/models/meta`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`models meta API ${response.status}`);

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new Error("models meta API invalid JSON");
  }
  if (!isModelsMetaResponse(value)) throw new Error("models meta API contract violation");

  const bySlug = new Map<string, DiscoverableModel>();
  for (const model of value.models) bySlug.set(model.slug, model);
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}
