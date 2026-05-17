import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  REQUIRED_SECTIONS,
  exercise as exerciseSchema,
  moduleFrontmatter,
  type Exercise,
  type ModuleDetail,
  type ModuleSummary,
} from "@app/shared";
import { z } from "zod";

const exercisesFileSchema = z.object({
  exercises: z.array(exerciseSchema),
});

// ── In-memory cache ──────────────────────────────────────────────────────────
// Content only changes on deploy (process restart), so we cache indefinitely.
let allModulesCache: ModuleDetail[] | null = null;
// Per-slug cache for full module detail (body + exercises)
const moduleCache = new Map<string, ModuleDetail>();

function assertAllSections(slug: string, body: string) {
  const missing = REQUIRED_SECTIONS.filter(
    (s) => !new RegExp(`^##\\s+${s}\\s*$`, "m").test(body),
  );
  if (missing.length > 0) {
    throw new Error(
      `Module "${slug}" is missing required sections: ${missing.join(", ")}`,
    );
  }
}

async function loadOne(
  contentDir: string,
  slug: string,
): Promise<ModuleDetail> {
  const cached = moduleCache.get(slug);
  if (cached) return cached;

  const moduleDir = path.join(contentDir, slug);
  const mdxPath = path.join(moduleDir, "index.mdx");
  const exercisesPath = path.join(moduleDir, "exercises.json");

  const [raw, exercisesRaw] = await Promise.all([
    fs.readFile(mdxPath, "utf-8"),
    fs.readFile(exercisesPath, "utf-8"),
  ]);

  const parsed = matter(raw);
  const fm = moduleFrontmatter.parse({ ...parsed.data, slug });
  if (!fm.placeholder) assertAllSections(slug, parsed.content);

  const { exercises } = exercisesFileSchema.parse(JSON.parse(exercisesRaw));

  const module: ModuleDetail = {
    ...fm,
    body: parsed.content,
    exercises,
    exerciseCount: exercises.length,
  };

  moduleCache.set(slug, module);
  return module;
}

export async function loadAllModules(
  contentDir: string,
): Promise<ModuleDetail[]> {
  if (allModulesCache) return allModulesCache;

  const entries = await fs.readdir(contentDir, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  const modules = await Promise.all(slugs.map((s) => loadOne(contentDir, s)));
  allModulesCache = modules.sort((a, b) => a.order - b.order);
  return allModulesCache;
}

export async function loadModule(
  contentDir: string,
  slug: string,
): Promise<ModuleDetail> {
  return loadOne(contentDir, slug);
}

export function toSummary(m: ModuleDetail): ModuleSummary {
  const { body: _b, exercises: _e, ...rest } = m;
  return rest;
}

export type { Exercise };
