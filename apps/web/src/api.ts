import type {
  AttemptInput,
  ModuleDetail,
  ModuleGroupDetail,
  ModuleGroupSummary,
  ModuleGroupTest,
  ModuleSummary,
  ReferenceDetail,
  ReferenceSummary,
} from "@app/shared";

const BASE = "/api";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listModules: () => jsonFetch<ModuleSummary[]>("/modules"),
  getModule: (slug: string) => jsonFetch<ModuleDetail>(`/modules/${slug}`),
  recordAttempt: (input: AttemptInput) =>
    jsonFetch<unknown>("/attempts", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  completeModule: (slug: string, score: number) =>
    jsonFetch<unknown>(`/progress/${slug}/complete`, {
      method: "POST",
      body: JSON.stringify({ score }),
    }),
  getProgress: () => jsonFetch<{ slug: string; lastScore: number | null; completedAt: string | null }[]>("/progress"),
  listReferences: () => jsonFetch<ReferenceSummary[]>("/references"),
  getReference: (slug: string) => jsonFetch<ReferenceDetail>(`/references/${slug}`),
  listGroups: () => jsonFetch<ModuleGroupSummary[]>("/groups"),
  getGroup: (slug: string) => jsonFetch<ModuleGroupDetail>(`/groups/${slug}`),
  getGroupTest: (slug: string) =>
    jsonFetch<ModuleGroupTest>(`/groups/${slug}/test`),
  getMasterTest: () =>
    jsonFetch<ModuleGroupTest>("/groups/master/test"),
};
