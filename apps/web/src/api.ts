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

export type AuthUser = { id: string; name: string };

export type MockQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
};

// iBT package shape
export type IbtPackage = {
  id: string;
  format?: undefined | null;
  title: string;
  reading: {
    timeLimit: number;
    passages: { id: string; title: string; text: string; questions: MockQuestion[] }[];
  };
  listening: {
    timeLimit: number;
    tracks: { id: string; type: string; script: string; questions: MockQuestion[] }[];
  };
  speaking: {
    timeLimit: number;
    tasks: {
      id: string; type: string; number: number; prompt: string;
      prepTime: number; responseTime: number;
      readingText?: string; listeningScript?: string;
    }[];
  };
  writing: {
    timeLimit: number;
    tasks: {
      id: string; type: string; prompt: string; timeLimit: number;
      readingText?: string; listeningScript?: string;
      professorPrompt?: string; student1Response?: string; student2Response?: string;
      wordCountMin?: number; wordCountMax?: number;
    }[];
  };
};

// ITP question item shapes
export type ItpShortItem = {
  id: string; script: string; question: string;
  options: string[]; answer: string; explanation: string;
};
export type ItpLongItem = {
  id: string; script: string;
  questions: { id: string; question: string; options: string[]; answer: string; explanation: string }[];
};
export type ItpStructureItem = {
  id: string; prompt: string; options: string[]; answer: string; explanation: string;
};
export type ItpErrorItem = {
  id: string; prompt: string; options: string[]; answer: string; explanation: string;
};

// ITP package shape
export type ItpPackage = {
  id: string;
  format: "itp";
  title: string;
  listening: {
    timeLimit: number;
    totalQuestions: number;
    parts: (
      | { id: string; type: "short_conversation"; name: string; instruction: string; items: ItpShortItem[] }
      | { id: string; type: "long_conversation" | "mini_lecture"; name: string; instruction: string; items: ItpLongItem[] }
    )[];
  };
  structure: {
    timeLimit: number;
    totalQuestions: number;
    parts: (
      | { id: string; type: "sentence_completion"; name: string; instruction: string; items: ItpStructureItem[] }
      | { id: string; type: "error_identification"; name: string; instruction: string; items: ItpErrorItem[] }
    )[];
  };
  reading: {
    timeLimit: number;
    totalQuestions: number;
    passages: { id: string; title: string; text: string; questions: MockQuestion[] }[];
  };
};

export type MockTestPackage = IbtPackage | ItpPackage;

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function storeUser(user: AuthUser) {
  localStorage.setItem("auth_user", JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem("auth_user");
}

function authHeaders(): HeadersInit {
  const user = getStoredUser();
  return {
    "content-type": "application/json",
    ...(user ? { "x-user-id": user.id } : {}),
  };
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + url, {
    headers: authHeaders(),
    ...init,
    // Merge headers so init can override but x-user-id is always present
    ...(init?.headers
      ? { headers: { ...authHeaders(), ...(init.headers as Record<string, string>) } }
      : {}),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (name: string, pin: string) =>
    jsonFetch<{ id: string; name: string; created: boolean }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ name, pin }),
    }),
  getMe: () => jsonFetch<{ id: string; name: string }>("/auth/me"),

  // Content
  listModules: () => jsonFetch<ModuleSummary[]>("/modules"),
  getModule: (slug: string) => jsonFetch<ModuleDetail>(`/modules/${slug}`),
  listReferences: () => jsonFetch<ReferenceSummary[]>("/references"),
  getReference: (slug: string) => jsonFetch<ReferenceDetail>(`/references/${slug}`),
  listGroups: () => jsonFetch<ModuleGroupSummary[]>("/groups"),
  getGroup: (slug: string) => jsonFetch<ModuleGroupDetail>(`/groups/${slug}`),
  getGroupTest: (slug: string) =>
    jsonFetch<ModuleGroupTest>(`/groups/${slug}/test`),
  getMasterTest: () =>
    jsonFetch<ModuleGroupTest>("/groups/master/test"),
  getMasterGroupTest: (masterSlug: string) =>
    jsonFetch<ModuleGroupTest>(`/groups/${masterSlug}/master-test`),

  // Mock tests
  listMockTests: () => jsonFetch<{ id: string; title: string; format?: string }[]>("/mock-tests"),
  getMockTest: (id: string) => jsonFetch<MockTestPackage>(`/mock-tests/${id}`),

  // User progress
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
  getProgress: () =>
    jsonFetch<{ slug: string; lastScore: number | null; completedAt: string | null }[]>("/progress"),
};
